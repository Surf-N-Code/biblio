import { NextResponse } from "next/server";
import { getOpenAI, getOpenAIModelComplex } from "@/lib/ai/openai-client";
import { openAIErrorResponse } from "@/lib/ai/openai-error";
import { requireSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const reference = typeof input.reference === "string" ? input.reference.trim() : "";
  const passage = typeof input.passage === "string" ? input.passage.trim() : "";
  const question = typeof input.question === "string" ? input.question.trim() : "";
  if (!reference || reference.length > 200 || !passage || passage.length > 50_000) {
    return NextResponse.json({ error: "Invalid verse selection" }, { status: 400 });
  }
  if (!question || question.length > 2_000) {
    return NextResponse.json({ error: "Bitte gib eine Frage ein (max. 2000 Zeichen)." }, { status: 400 });
  }

  const client = getOpenAI();
  if (!client) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 },
    );
  }

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: getOpenAIModelComplex(),
      messages: [
        {
          role: "system",
          content:
            "Du beantwortest Fragen zu ausgewählten Bibelversen auf Deutsch (du-Form). Beziehe dich konkret auf die angegebene Stelle und ihren Text. Unterscheide klar zwischen dem, was dort steht, und einer Deutung. Wenn die Stelle eine Frage nicht beantwortet, sage das offen; erfinde keinen Kontext und keine Quellen. Antworte sachlich und verständlich in Markdown, ohne Code-Block um die Antwort.",
        },
        {
          role: "user",
          content: `Ausgewählte Stelle: ${reference}\n\nVers-Text:\n${passage}\n\nFrage:\n${question}`,
        },
      ],
      max_tokens: 1200,
    });
  } catch (error) {
    return openAIErrorResponse(error);
  }

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ text });
}
