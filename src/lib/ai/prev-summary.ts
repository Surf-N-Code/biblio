import "server-only";

import { joinKeys } from "unstorage";
import { loadChapterPlainText } from "@/lib/bible/api";
import type { BibleReadLang } from "@/lib/bible/read-language";
import { getOpenAI, getOpenAIModelQuick } from "@/lib/ai/openai-client";
import { getPrevChapterSummaryStorage } from "@/lib/ai/prev-summary-storage";

const PROMPT_VERSION = "1";

export async function getPreviousChaptersContext(
  usfm: string,
  slug: string,
  chapter: number,
  lang: BibleReadLang = "en",
): Promise<string | null> {
  if (chapter <= 1) return null;

  const storage = getPrevChapterSummaryStorage();
  const key = joinKeys(PROMPT_VERSION, lang, usfm, slug, String(chapter));
  try {
    if (await storage.hasItem(key)) {
      const cached = await storage.getItem(key);
      if (typeof cached === "string" && cached.length > 0) {
        return cached;
      }
    }
  } catch {
    /* Redis unreachable or cache error — generate without cache */
  }

  const prev = chapter - 1;
  let text: string;
  try {
    text = await loadChapterPlainText(usfm, slug, prev, lang);
  } catch {
    return "Kontext konnte nicht geladen werden.";
  }
  const truncated = text.slice(0, 14_000);
  const client = getOpenAI();
  if (!client) {
    throw new Error("Summary provider is not configured");
  }
  const completion = await client.chat.completions.create({
    model: getOpenAIModelQuick(),
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
  const summary =
    completion.choices[0]?.message?.content?.trim() ||
    "Keine Zusammenfassung verfügbar.";

  if (summary !== "Keine Zusammenfassung verfügbar.") {
    try {
      await storage.setItem(key, summary);
    } catch {
      /* ignore persistence errors (e.g. read-only filesystem) */
    }
  }

  return summary;
}
