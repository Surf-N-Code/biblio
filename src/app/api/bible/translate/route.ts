import { NextResponse } from "next/server";
import {
  getOpenRouter,
  OPENROUTER_MODEL_QUICK,
} from "@/lib/ai/openrouter-client";

export const runtime = "nodejs";

type Body = { text: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 50_000) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }

  const deepl = process.env.DEEPL_API_KEY?.trim();
  if (deepl) {
    const params = new URLSearchParams({
      text,
      target_lang: "DE",
      source_lang: "EN",
    });
    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${deepl}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `DeepL error: ${err.slice(0, 200)}` },
        { status: 502 },
      );
    }
    const json = (await res.json()) as {
      translations?: Array<{ text?: string }>;
    };
    const out = json.translations?.[0]?.text?.trim();
    if (out) return NextResponse.json({ text: out, provider: "deepl" });
  }

  const client = getOpenRouter();
  if (!client) {
    return NextResponse.json(
      { error: "Configure DEEPL_API_KEY or OPENROUTER_API_KEY" },
      { status: 503 },
    );
  }

  const completion = await client.chat.completions.create({
    model: OPENROUTER_MODEL_QUICK,
    messages: [
      {
        role: "system",
        content:
          "Translate the user text to German. Output only the translation, informal 'du' where appropriate for UI, preserve verse numbers and formatting loosely.",
      },
      { role: "user", content: text },
    ],
    max_tokens: 4000,
  });

  const out = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ text: out, provider: "openrouter" });
}
