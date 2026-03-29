import { fetchChapterBibleApiCom } from "./bible-api-com";
import {
  getAmplifiedBibleId,
  getPrimaryBibleId,
  hasScriptureApiKey,
  SCRIPTURE_BASE,
} from "./config";
import { chapterId } from "./canonical-books";
import { parseChapterHtmlToVerses, type ParsedVerse } from "./parse-chapter-html";
import { getChapterFromLocalNlt, hasLocalNltFile } from "./nlt-local";

export type ChapterSource = "local-nlt" | "api-bible" | "bible-api-com";

export type LoadedChapter = {
  verses: ParsedVerse[];
  source: ChapterSource;
  bibleLabel: string;
};

async function fetchApiBibleChapterVerses(
  bibleId: string,
  usfm: string,
  chapter: number,
): Promise<ParsedVerse[]> {
  const key = process.env.SCRIPTURE_API_KEY?.trim();
  if (!key) throw new Error("SCRIPTURE_API_KEY missing");
  const cid = chapterId(usfm, chapter);
  const url = `${SCRIPTURE_BASE}/bibles/${bibleId}/chapters/${cid}`;
  const res = await fetch(url, {
    headers: {
      "api-key": key,
      accept: "application/json",
    },
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API.Bible ${res.status}: ${err.slice(0, 200)}`);
  }
  const json: unknown = await res.json();
  const data = (json as { data?: Record<string, unknown> }).data;
  if (!data) throw new Error("API.Bible: empty data");

  const versesUnknown = data.verses;
  if (Array.isArray(versesUnknown)) {
    const verses = versesUnknown as Array<{
      verse?: string | number;
      text?: string;
      content?: string;
    }>;
    const mapped: ParsedVerse[] = [];
    for (const row of verses) {
      const v =
        typeof row.verse === "string"
          ? Number(row.verse)
          : typeof row.verse === "number"
            ? row.verse
            : NaN;
      const text = (row.text ?? row.content ?? "").replace(/\s+/g, " ").trim();
      if (Number.isFinite(v) && v > 0 && text) mapped.push({ verse: v, text });
    }
    if (mapped.length) {
      mapped.sort((a, b) => a.verse - b.verse);
      return mapped;
    }
  }

  let html: string | undefined;
  if (typeof data.content === "string") html = data.content;
  else {
    const c = data.content as { html?: string } | undefined;
    if (c && typeof c.html === "string") html = c.html;
  }
  if (html) {
    const parsed = parseChapterHtmlToVerses(html);
    if (parsed.length) return parsed;
  }

  throw new Error("API.Bible: could not parse chapter into verses");
}

export async function loadPrimaryChapter(
  usfm: string,
  slug: string,
  chapter: number,
): Promise<LoadedChapter> {
  if (hasLocalNltFile()) {
    const local = getChapterFromLocalNlt(usfm, chapter);
    if (local?.length) {
      return {
        verses: local,
        source: "local-nlt",
        bibleLabel: "NLT (local file)",
      };
    }
  }

  const primaryId = getPrimaryBibleId();
  if (hasScriptureApiKey() && primaryId) {
    try {
      const verses = await fetchApiBibleChapterVerses(primaryId, usfm, chapter);
      return { verses, source: "api-bible", bibleLabel: "API.Bible (primary)" };
    } catch {
      // fall through to bible-api.com
    }
  }
  const verses = await fetchChapterBibleApiCom(slug, chapter);
  return { verses, source: "bible-api-com", bibleLabel: "WEB (bible-api.com)" };
}

export async function loadAmplifiedChapter(
  usfm: string,
  chapter: number,
): Promise<ParsedVerse[] | null> {
  const ampId = getAmplifiedBibleId();
  if (!hasScriptureApiKey() || !ampId) return null;
  try {
    return await fetchApiBibleChapterVerses(ampId, usfm, chapter);
  } catch {
    return null;
  }
}

export async function loadChapterPlainText(
  usfm: string,
  slug: string,
  chapter: number,
): Promise<string> {
  const { verses } = await loadPrimaryChapter(usfm, slug, chapter);
  return verses.map((v) => `${v.verse} ${v.text}`).join("\n");
}
