import { NextResponse } from "next/server";
import {
  bibleAiSystemSuffix,
  buildBibleAiUserContent,
  parseBibleAiBody,
} from "@/lib/ai/bible-prompt-context";
import { getOpenAI, getOpenAIModelQuick } from "@/lib/ai/openai-client";
import { openAIErrorResponse } from "@/lib/ai/openai-error";
import { requireSession } from "@/lib/auth/session";

export const runtime = "nodejs";

type Body = {
  reference: string;
  passage: string;
  chapterText?: string;
  bookName?: string;
  /** Verse-scoped Matthew Henry excerpt (same selection as in the reader). */
  matthewHenryExcerpt?: string;
};

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseBibleAiBody(body as Record<string, unknown>);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid passage" }, { status: 400 });
  }
  const mh =
    typeof body.matthewHenryExcerpt === "string" ? body.matthewHenryExcerpt.trim() : "";
  if (mh.length > 120_000) {
    return NextResponse.json({ error: "Matthew Henry excerpt too long" }, { status: 400 });
  }

  const client = getOpenAI();
  if (!client) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const extraSections = mh
    ? [
        "",
        "Matthew Henry (Auszug nur zu dieser Auswahl; historischer Kommentar, öffentlicher Bereich):",
        mh,
      ]
    : [];
  const userContent = buildBibleAiUserContent(
    {
      reference: parsed.reference,
      selectedPassage: parsed.selectedPassage,
      chapterText: parsed.chapterText || parsed.selectedPassage,
      bookName: parsed.bookName,
    },
    extraSections,
  );

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: getOpenAIModelQuick(),
      messages: [
        {
          role: "system",
          content:
            `Du gibst historischen und literarischen Kontext zu Bibelstellen auf Deutsch (du-Form): Zeit, Ort, Genre, Anschluss an das Vorangehende. ${bibleAiSystemSuffix()} Nutze den Matthew-Henry-Auszug nur als eine historische Stimme unter anderen, nicht als alleinige Autorität. Neutral und knapp. Formatiere in Markdown (##, **fett**, Listen mit -). Kein Code-Block um den gesamten Text.`,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      max_tokens: 900,
    });
  } catch (error) {
    return openAIErrorResponse(error);
  }

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ text });
}
