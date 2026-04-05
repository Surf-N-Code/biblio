import { NextResponse } from "next/server";
import {
  getOpenRouter,
  OPENROUTER_MODEL_QUICK,
} from "@/lib/ai/openrouter-client";

export const runtime = "nodejs";

type Body = {
  reference: string;
  passage: string;
  /** Verse-scoped Matthew Henry excerpt (same selection as in the reader). */
  matthewHenryExcerpt?: string;
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
  const mh =
    typeof body.matthewHenryExcerpt === "string" ? body.matthewHenryExcerpt.trim() : "";
  if (!passage || passage.length > 50_000) {
    return NextResponse.json({ error: "Invalid passage" }, { status: 400 });
  }
  if (mh.length > 120_000) {
    return NextResponse.json({ error: "Matthew Henry excerpt too long" }, { status: 400 });
  }

  const client = getOpenRouter();
  if (!client) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const userParts = [
    `Stelle: ${reference}`,
    "",
    "Text:",
    passage,
  ];
  if (mh) {
    userParts.push(
      "",
      "Matthew Henry (Auszug nur zu dieser Auswahl; historischer Kommentar, öffentlicher Bereich):",
      mh,
    );
  }

  const completion = await client.chat.completions.create({
    model: OPENROUTER_MODEL_QUICK,
    messages: [
      {
        role: "system",
        content:
          "Du gibst historischen und literarischen Kontext zu Bibelstellen auf Deutsch (du-Form): Zeit, Ort, Genre, Anschluss an das Vorangehende. Nutze den Matthew-Henry-Auszug nur als eine historische Stimme unter anderen, nicht als alleinige Autorität. Neutral und knapp. Formatiere in Markdown (##, **fett**, Listen mit -). Kein Code-Block um den gesamten Text.",
      },
      {
        role: "user",
        content: userParts.join("\n"),
      },
    ],
    max_tokens: 900,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ text });
}
