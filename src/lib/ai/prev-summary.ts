import { unstable_cache } from "next/cache";
import { loadChapterPlainText } from "@/lib/bible/api";
import {
  getOpenRouter,
  OPENROUTER_MODEL_QUICK,
} from "@/lib/ai/openrouter-client";

const PROMPT_VERSION = "1";

export async function getPreviousChaptersContext(
  usfm: string,
  slug: string,
  chapter: number,
): Promise<string | null> {
  if (chapter <= 1) return null;

  return unstable_cache(
    async () => {
      const prev = chapter - 1;
      let text: string;
      try {
        text = await loadChapterPlainText(usfm, slug, prev);
      } catch {
        return "Kontext konnte nicht geladen werden.";
      }
      const truncated = text.slice(0, 14_000);
      const client = getOpenRouter();
      if (!client) {
        return "Setze OPENROUTER_API_KEY für eine KI-Zusammenfassung der vorherigen Kapitel.";
      }
      const completion = await client.chat.completions.create({
        model: OPENROUTER_MODEL_QUICK,
        messages: [
          {
            role: "system",
            content:
              "Du fasst Bibelkapitel kurz zusammen (2–5 Sätze), sachlich und neutral. Antworte auf Deutsch mit der informellen Anrede „du“.",
          },
          {
            role: "user",
            content: `Das aktuelle Kapitel ist Kapitel ${chapter}. Fasse nur das unmittelbar vorhergehende Kapitel (Kapitel ${prev}) zusammen, damit Leser den Anschluss verstehen.\n\nText von Kapitel ${prev}:\n\n${truncated}`,
          },
        ],
        max_tokens: 400,
      });
      return (
        completion.choices[0]?.message?.content?.trim() ||
        "Keine Zusammenfassung verfügbar."
      );
    },
    ["prev-chapter-summary", PROMPT_VERSION, usfm, slug, String(chapter)],
    { revalidate: 86_400 },
  )();
}
