import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { normalizeUsernameKey } from "@/lib/auth/users";
import { VERSE_AI_KINDS, type VerseAiAnswer } from "@/lib/bible/verse-ai-answer";
import { addVerseAiAnswer, getVerseAiAnswers } from "@/lib/server/verse-ai-answers-redis";

export const runtime = "nodejs";

function validChapter(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 200;
}

function validUsfm(value: string): boolean {
  return /^[A-Z0-9]{2,8}$/.test(value);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const usfm = params.get("usfm")?.toUpperCase() ?? "";
  const chapter = Number(params.get("chapter"));
  if (!validUsfm(usfm) || !validChapter(chapter)) {
    return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
  }

  try {
    const answers = await getVerseAiAnswers(normalizeUsernameKey(session.username), usfm, chapter);
    return NextResponse.json({ answers }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[ai-answers] Redis read unavailable");
    return NextResponse.json({ error: "KI-Antworten konnten nicht geladen werden." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const usfm = typeof input.usfm === "string" ? input.usfm.toUpperCase() : "";
  const chapter = input.chapter;
  const verses = input.verses;
  const reference = typeof input.reference === "string" ? input.reference.trim() : "";
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const kind = input.kind;
  if (
    !validUsfm(usfm) || typeof chapter !== "number" || !validChapter(chapter) ||
    !Array.isArray(verses) || verses.length < 1 || verses.length > 200 ||
    !verses.every((verse) => typeof verse === "number" && Number.isInteger(verse) && verse >= 1 && verse <= 200) ||
    !reference || reference.length > 200 || !text || text.length > 50_000 ||
    !VERSE_AI_KINDS.includes(kind as (typeof VERSE_AI_KINDS)[number])
  ) {
    return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  }

  const answer: VerseAiAnswer = {
    id: randomUUID(), usfm, chapter,
    verses: [...new Set(verses as number[])].sort((a, b) => a - b),
    reference, kind: kind as VerseAiAnswer["kind"], text, createdAt: Date.now(),
  };
  try {
    await addVerseAiAnswer(normalizeUsernameKey(session.username), answer);
    return NextResponse.json({ answer }, { status: 201 });
  } catch {
    console.error("[ai-answers] Redis write unavailable");
    return NextResponse.json({ error: "KI-Antwort konnte nicht gespeichert werden." }, { status: 503 });
  }
}
