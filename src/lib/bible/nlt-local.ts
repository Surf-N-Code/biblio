import fs from "fs";
import path from "path";
import type { ParsedVerse } from "./parse-chapter-html";
import { nltAbbrevForUsfm } from "./nlt-abbrev";

const VERSE_START = /^\s*([^\s]+)\s+(\d+):(\d+)\s+(.*)$/;

/** bookAbbrev → chapter → verse → text */
type NltIndex = Map<string, Map<number, Map<number, string>>>;

let indexCache: NltIndex | null = null;
let indexPath: string | null = null;

function defaultNltPath(): string {
  return process.env.BIBLE_NLT_PATH?.trim() || path.join(process.cwd(), "data/bibles/NLT.txt");
}

function buildIndex(filePath: string): NltIndex {
  const index: NltIndex = new Map();
  if (!fs.existsSync(filePath)) return index;

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  let current: {
    book: string;
    chapter: number;
    verse: number;
    text: string;
  } | null = null;

  const flush = () => {
    if (!current) return;
    if (!index.has(current.book)) index.set(current.book, new Map());
    const chMap = index.get(current.book)!;
    if (!chMap.has(current.chapter)) chMap.set(current.chapter, new Map());
    chMap.get(current.chapter)!.set(current.verse, current.text.trim());
    current = null;
  };

  for (const line of lines) {
    const m = line.match(VERSE_START);
    if (m) {
      flush();
      current = {
        book: m[1],
        chapter: Number(m[2]),
        verse: Number(m[3]),
        text: m[4].trim(),
      };
    } else if (current && line.trim()) {
      current.text += " " + line.trim();
    }
  }
  flush();
  return index;
}

function getIndex(): NltIndex {
  const filePath = defaultNltPath();
  if (indexCache && indexPath === filePath) return indexCache;
  indexPath = filePath;
  indexCache = buildIndex(filePath);
  return indexCache;
}

export function hasLocalNltFile(): boolean {
  return fs.existsSync(defaultNltPath());
}

export function getChapterFromLocalNlt(
  usfm: string,
  chapter: number,
): ParsedVerse[] | null {
  const abbrev = nltAbbrevForUsfm(usfm);
  if (!abbrev) return null;
  const idx = getIndex();
  const bookMap = idx.get(abbrev);
  if (!bookMap) return null;
  const verseMap = bookMap.get(chapter);
  if (!verseMap?.size) return null;
  const verses: ParsedVerse[] = [...verseMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([verse, text]) => ({
      verse,
      text: text.replace(/\s+/g, " ").trim(),
    }));
  return verses.length ? verses : null;
}

/** For tests / warm-up */
export function clearNltIndexCache(): void {
  indexCache = null;
  indexPath = null;
}
