import { parse, type HTMLElement } from "node-html-parser";
import { mhPassageAbbrevForUsfm } from "./mh-passage-abbrev";

/** Parse `Joh+3:16-18` / `Ge+1:1,2` style passage param from href. */
export function parsePassageFromHref(href: string): {
  abbrev: string;
  chapter: number;
  verses: number[];
} | null {
  const m = /passage=([^&]+)/i.exec(href);
  if (!m) return null;
  const decoded = decodeURIComponent(m[1]);
  if (!decoded.includes("+")) return null;
  const main = /^(.+)\+(\d+):(.+)$/.exec(decoded);
  if (!main) return null;
  const abbrev = main[1];
  const chapter = Number(main[2]);
  const rest = main[3].trim();
  const verses: number[] = [];
  for (const segment of rest.split(",").map((s) => s.trim())) {
    if (!segment) continue;
    if (segment.includes("-")) {
      const parts = segment.split("-").map((p) => parseInt(p.trim(), 10));
      const a = parts[0];
      const b = parts[1];
      if (Number.isFinite(a) && Number.isFinite(b)) {
        for (let v = Math.min(a, b); v <= Math.max(a, b); v++) verses.push(v);
      }
    } else {
      const n = parseInt(segment, 10);
      if (Number.isFinite(n)) verses.push(n);
    }
  }
  if (!verses.length || !Number.isFinite(chapter)) return null;
  return { abbrev, chapter, verses: [...new Set(verses)].sort((a, b) => a - b) };
}

function abbrevMatches(expected: string, parsed: string): boolean {
  return expected.localeCompare(parsed, undefined, { sensitivity: "accent" }) === 0;
}

function paragraphText(el: HTMLElement): string {
  return el.text.replace(/\s+/g, " ").trim();
}

/**
 * Keep <p> blocks whose passage links point to this book+chapter and overlap `selectedVerses`.
 * Continues a few paragraphs after a match when they carry the discussion (no in-chapter verse links).
 */
export function extractMatthewHenryForVerses(
  html: string,
  usfm: string,
  chapter: number,
  selectedVerses: number[],
): string {
  const expectedAbbrev = mhPassageAbbrevForUsfm(usfm);
  if (!expectedAbbrev || selectedVerses.length === 0) return "";

  const selected = new Set(selectedVerses);
  const root = parse(html);
  const body = root.querySelector("body") || root;
  const paragraphs = body.querySelectorAll("p");

  const picked: string[] = [];
  let prevMatched = false;
  let bridgeLeft = 0;

  for (const p of paragraphs) {
    const el = p as HTMLElement;
    const links = el.querySelectorAll('a[href*="passage="]');
    const text = paragraphText(el);
    if (text.length < 8) continue;

    let overlaps = false;
    let hasInChapterLink = false;

    for (const a of links) {
      const parsed = parsePassageFromHref(a.getAttribute("href") ?? "");
      if (!parsed) continue;
      if (!abbrevMatches(expectedAbbrev, parsed.abbrev)) continue;
      if (parsed.chapter !== chapter) continue;
      hasInChapterLink = true;
      for (const v of parsed.verses) {
        if (selected.has(v)) overlaps = true;
      }
    }

    if (overlaps) {
      picked.push(text);
      prevMatched = true;
      bridgeLeft = 4;
      continue;
    }

    if (hasInChapterLink) {
      prevMatched = false;
      bridgeLeft = 0;
      continue;
    }

    if (prevMatched && bridgeLeft > 0 && text.length > 35) {
      picked.push(text);
      bridgeLeft--;
      continue;
    }

    prevMatched = false;
  }

  if (picked.length > 0) {
    return picked.join("\n\n");
  }

  return extractChapterOutlineFallback(html);
}

function extractChapterOutlineFallback(html: string): string {
  const root = parse(html);
  const body = root.querySelector("body") || root;
  const paragraphs = body.querySelectorAll("p");
  const chunks: string[] = [];
  let total = 0;
  for (const p of paragraphs) {
    const t = paragraphText(p as HTMLElement);
    if (t.length < 80) continue;
    chunks.push(t);
    total += t.length;
    if (total >= 2800 || chunks.length >= 4) break;
  }
  return chunks.join("\n\n");
}
