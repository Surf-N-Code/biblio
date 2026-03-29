import { parse, type HTMLElement } from "node-html-parser";

export type ParsedVerse = { verse: number; text: string };

function normalizeVerseText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Best-effort extraction for API.Bible-style chapter HTML (markup varies by translation). */
export function parseChapterHtmlToVerses(html: string): ParsedVerse[] {
  const root = parse(html);
  const candidates: ParsedVerse[] = [];

  const trySpanVerse = (el: HTMLElement) => {
    const cls = el.getAttribute("class") ?? "";
    const dataNum = el.getAttribute("data-number");
    const dataUsfm = el.getAttribute("data-usfm");
    let verseNum: number | null = null;
    if (dataNum && /^\d+$/.test(dataNum)) verseNum = Number(dataNum);
    if (verseNum === null && dataUsfm) {
      const m = /\.(\d+)$/.exec(dataUsfm);
      if (m) verseNum = Number(m[1]);
    }
    if (verseNum === null && /(^|\s)v\b/i.test(cls)) {
      const t = normalizeVerseText(el.text);
      const nm = /^(\d+)\s*/.exec(t);
      if (nm) verseNum = Number(nm[1]);
    }
    if (verseNum === null) return;
    let text = el.text;
    text = text.replace(/^\d+\s*/, "").trim();
    text = normalizeVerseText(text);
    if (!text) return;
    candidates.push({ verse: verseNum, text });
  };

  root.querySelectorAll("span").forEach((el) => trySpanVerse(el as HTMLElement));

  if (candidates.length >= 2) {
    candidates.sort((a, b) => a.verse - b.verse);
    const dedup: ParsedVerse[] = [];
    const seen = new Set<number>();
    for (const v of candidates) {
      if (seen.has(v.verse)) continue;
      seen.add(v.verse);
      dedup.push(v);
    }
    return dedup;
  }

  const text = normalizeVerseText(root.text);
  const loose: ParsedVerse[] = [];
  const re = /(\d+)\s+([\s\S]*?)(?=\s\d+\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(` ${text} `)) !== null) {
    const verse = Number(m[1]);
    const body = normalizeVerseText(m[2]);
    if (verse > 0 && body) loose.push({ verse, text: body });
  }
  if (loose.length >= 2) {
    loose.sort((a, b) => a.verse - b.verse);
    return loose;
  }

  return [];
}
