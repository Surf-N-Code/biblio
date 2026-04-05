import { NextResponse } from "next/server";
import {
  getOpenRouter,
  OPENROUTER_MODEL_COMPLEX,
  OPENROUTER_MODEL_QUICK,
} from "@/lib/ai/openrouter-client";

export const runtime = "nodejs";

type Body = {
  reference: string;
  passage: string;
  detail?: "brief" | "extensive";
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const passage = typeof body.passage === "string" ? body.passage.trim() : "";
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  const detail = body.detail === "extensive" ? "extensive" : "brief";
  if (!passage || passage.length > 50_000) {
    return NextResponse.json({ error: "Invalid passage" }, { status: 400 });
  }

  const client = getOpenRouter();
  if (!client) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const instruction =
    detail === "brief"
      ? "Erkläre in 3–6 kurzen Sätzen auf Deutsch (du-Form), sachlich und neutral."
      : "Erkläre ausführlich auf Deutsch (du-Form) mit Absätzen: Hintergrund, Bedeutung im Kontext, mögliche Anwendung — sachlich und ohne Dogma.";

  const model =
    detail === "brief" ? OPENROUTER_MODEL_QUICK : OPENROUTER_MODEL_COMPLEX;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `Du bist ein Bibellektor. ${instruction} Keine Predigt, keine persönliche Seelsorge. Formatiere die Antwort in Markdown (z. B. ## für Abschnitte, **fett** für Kernbegriffe, Aufzählungen mit -). Kein Code-Block um den gesamten Text.`,
      },
      {
        role: "user",
        content: `Stelle: ${reference}\n\nText:\n${passage}`,
      },
    ],
    max_tokens: detail === "brief" ? 400 : 1200,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ text });
}
