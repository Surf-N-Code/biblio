import type { ParsedVerse } from "./parse-chapter-html";

type BibleApiComResponse = {
  reference: string;
  verses: Array<{
    book_id: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
};

/** Public-domain WEB text via bible-api.com (no key). Used when API.Bible is not configured. */
export async function fetchChapterBibleApiCom(
  slug: string,
  chapter: number,
): Promise<ParsedVerse[]> {
  const book = slug.replace(/-/g, "+");
  const url = `https://bible-api.com/${book}+${chapter}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`bible-api.com ${res.status}`);
  }
  const json = (await res.json()) as BibleApiComResponse;
  return json.verses
    .map((v) => ({
      verse: v.verse,
      text: v.text.replace(/\s+/g, " ").trim(),
    }))
    .sort((a, b) => a.verse - b.verse);
}
