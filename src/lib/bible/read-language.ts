export const BIBLE_READ_LANG_COOKIE = "biblio_bible_lang";

export type BibleReadLang = "en" | "de";

export function parseBibleReadLang(raw: string | undefined): BibleReadLang {
  return raw === "de" ? "de" : "en";
}
