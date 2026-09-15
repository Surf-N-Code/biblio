import { NextResponse } from "next/server";
import {
  bibleAiSystemSuffix,
  buildBibleAiUserContent,
  parseBibleAiBody,
} from "@/lib/ai/bible-prompt-context";
import { getOpenAI, getOpenAIModelQuick, getOpenAIModelComplex } from "@/lib/ai/openai-client";
import { openAIErrorResponse } from "@/lib/ai/openai-error";
import { requireSession } from "@/lib/auth/session";

export const runtime = "nodejs";

type Body = {
  reference: string;
  passage: string;
  chapterText?: string;
  bookName?: string;
  detail?: "brief" | "extensive";
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
  const detail = body.detail === "extensive" ? "extensive" : "brief";

  const client = getOpenAI();
  if (!client) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const instruction =
    detail === "brief"
      ? "Erkläre in 3–6 kurzen Sätzen auf Deutsch (du-Form), sachlich und neutral."
      : "Erkläre ausführlich auf Deutsch (du-Form) mit Absätzen: Hintergrund, Bedeutung im Kontext, mögliche Anwendung — sachlich und ohne Dogma.";

  const model =
    detail === "brief" ? getOpenAIModelQuick() : getOpenAIModelComplex();

  let completion;
  try {
    completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Du bist ein Bibellektor. ${instruction} ${bibleAiSystemSuffix()} Keine Predigt, keine persönliche Seelsorge. Formatiere die Antwort in Markdown (z. B. ## für Abschnitte, **fett** für Kernbegriffe, Aufzählungen mit -). Kein Code-Block um den gesamten Text.`,
        },
        {
          role: "user",
          content: buildBibleAiUserContent({
            reference: parsed.reference,
            selectedPassage: parsed.selectedPassage,
            chapterText: parsed.chapterText || parsed.selectedPassage,
            bookName: parsed.bookName,
          }),
        },
      ],
      max_tokens: detail === "brief" ? 400 : 1200,
    });
  } catch (error) {
    return openAIErrorResponse(error);
  }

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ text });
}
