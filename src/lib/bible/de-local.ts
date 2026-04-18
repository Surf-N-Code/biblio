import fs from "fs";
import path from "path";
import type { ParsedVerse } from "./parse-chapter-html";
import { CANONICAL_BOOKS } from "./canonical-books";
import { USFM_TO_NLT_ABBREV } from "./nlt-abbrev";

const VERSE_START = /^\s*([^\s]+)\s+(\d+):(\d+)\s+(.*)$/;

/** Unbound BCV: 01O = Genesis (OT book order 1), 40N = Matthew (NT order 40) */
const UNBOUND_BOOK = /^(\d{2})([ON])$/;

type VerseIndex = Map<number, Map<number, string>>;

type DeIndex = {
  /** usfm → chapter → verse → text */
  byUsfm: Map<string, VerseIndex>;
};

let indexCache: Map<string, DeIndex> = new Map();

function biblesDir(): string {
  return process.env.BIBLE_GERMAN_DIR?.trim() || path.join(process.cwd(), "data/bibles");
}

function safeBasename(name: string): string | null {
  const base = path.basename(name);
  if (!/^de_[a-zA-Z0-9._-]+\.txt$/.test(base)) return null;
  if (base.includes("..") || base.includes("/") || base.includes("\\")) return null;
  return base;
}

export function listGermanBibleFiles(): string[] {
  const dir = biblesDir();
  if (!fs.existsSync(dir)) return [];
  const names = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("de_") && f.endsWith(".txt"));
  const rank = (f: string) => (f === "de_luther1912.txt" ? 0 : 1);
  return names.sort((a, b) => {
    const d = rank(a) - rank(b);
    return d !== 0 ? d : a.localeCompare(b);
  });
}

/** Preferred `de_*.txt` for reading tools (Luther 1912 first when present). */
export function getDefaultGermanBibleFile(): string {
  const listed = listGermanBibleFiles();
  return listed[0] ?? "de_luther1912.txt";
}

function unboundCodeToUsfm(code: string): string | undefined {
  const m = UNBOUND_BOOK.exec(code.trim());
  if (!m) return undefined;
  const order = Number(m[1]);
  if (order < 1 || order > 66) return undefined;
  return CANONICAL_BOOKS[order - 1]?.usfm;
}

function buildIndexNltStyle(content: string): DeIndex {
  const byUsfm: DeIndex["byUsfm"] = new Map();
  const lines = content.split(/\r?\n/);

  let current: { usfm: string; chapter: number; verse: number; text: string } | null =
    null;

  const flush = () => {
    if (!current) return;
    if (!byUsfm.has(current.usfm)) byUsfm.set(current.usfm, new Map());
    const chMap = byUsfm.get(current.usfm)!;
    if (!chMap.has(current.chapter)) chMap.set(current.chapter, new Map());
    chMap.get(current.chapter)!.set(current.verse, current.text.trim());
    current = null;
  };

  for (const line of lines) {
    const m = line.match(VERSE_START);
    if (m) {
      flush();
      const abbrev = m[1];
      const usfm = Object.entries(USFM_TO_NLT_ABBREV).find(
        ([, a]) => a === abbrev,
      )?.[0];
      if (!usfm) continue;
      current = {
        usfm,
        chapter: Number(m[2]),
        verse: Number(m[3]),
        text: m[4].trim(),
      };
    } else if (current && line.trim()) {
      current.text += " " + line.trim();
    }
  }
  flush();
  return { byUsfm };
}

function buildIndexUnbound(content: string): DeIndex {
  const byUsfm: DeIndex["byUsfm"] = new Map();
  const lines = content.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.replace(/^\uFEFF/, "");
    if (!line.trim() || line.startsWith("#")) continue;

    const parts = line.split("\t");
    if (parts.length < 4) continue;

    const bookCode = parts[0].trim();
    const usfm = unboundCodeToUsfm(bookCode);
    if (!usfm) continue;

    const chapter = Number(parts[1]);
    const verse = Number(parts[2]);
    const text = parts.slice(3).join("\t").trim();
    if (!Number.isFinite(chapter) || !Number.isFinite(verse) || verse < 1 || !text) {
      continue;
    }

    if (!byUsfm.has(usfm)) byUsfm.set(usfm, new Map());
    const chMap = byUsfm.get(usfm)!;
    if (!chMap.has(chapter)) chMap.set(chapter, new Map());
    chMap.get(chapter)!.set(verse, text.replace(/\s+/g, " ").trim());
  }

  return { byUsfm };
}

function detectFormat(sample: string): "unbound" | "nlt" {
  const head = sample.slice(0, Math.min(sample.length, 48_000));
  for (const line of head.split(/\r?\n/)) {
    const t = line.replace(/^\uFEFF/, "").trim();
    if (!t || t.startsWith("#")) continue;
    if (t.includes("\t")) {
      const p = t.split("\t");
      if (p.length >= 4 && UNBOUND_BOOK.test(p[0].trim())) return "unbound";
    }
    if (VERSE_START.test(line)) return "nlt";
  }
  return "nlt";
}

function buildIndex(filePath: string): DeIndex {
  if (!fs.existsSync(filePath)) return { byUsfm: new Map() };
  const content = fs.readFileSync(filePath, "utf-8");
  const fmt = detectFormat(content);
  if (fmt === "unbound") return buildIndexUnbound(content);
  return buildIndexNltStyle(content);
}

function getIndexForFile(basename: string): DeIndex {
  const safe = safeBasename(basename);
  if (!safe) return { byUsfm: new Map() };
  const filePath = path.join(biblesDir(), safe);
  const cached = indexCache.get(filePath);
  if (cached) return cached;
  const built = buildIndex(filePath);
  indexCache.set(filePath, built);
  return built;
}

export function clearGermanBibleIndexCache(): void {
  indexCache = new Map();
}

export function getGermanChapterVerses(
  basename: string,
  usfm: string,
  chapter: number,
): ParsedVerse[] | null {
  const idx = getIndexForFile(basename);
  const u = usfm.toUpperCase();
  const bookMap = idx.byUsfm.get(u);
  if (!bookMap) return null;
  const verseMap = bookMap.get(chapter);
  if (!verseMap?.size) return null;
  const verses: ParsedVerse[] = [...verseMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([verse, text]) => ({ verse, text }));
  return verses.length ? verses : null;
}

export type GermanPassageResult = {
  label: string;
  reference: string;
  text: string;
};

export function getGermanPassageForVerses(
  basename: string,
  bookName: string,
  usfm: string,
  chapter: number,
  verseNums: number[],
): GermanPassageResult | { error: string } {
  const safe = safeBasename(basename);
  if (!safe) return { error: "Ungültige Datei." };

  const rows = getGermanChapterVerses(safe, usfm, chapter);
  if (!rows?.length) {
    return {
      error:
        "In dieser Datei wurden keine Verse gefunden. Unterstützt: Unbound-BCV (Tab-getrennt) oder Zeilen wie „Gen 1:1 …“ (wie NLT.txt).",
    };
  }

  const byV = new Map(rows.map((r) => [r.verse, r.text]));
  const missing: number[] = [];
  const lines: string[] = [];
  for (const n of [...new Set(verseNums)].sort((a, b) => a - b)) {
    const t = byV.get(n);
    if (t) lines.push(`${n} ${t}`);
    else missing.push(n);
  }

  if (!lines.length) {
    return { error: "Keine der ausgewählten Verse ist in dieser deutschen Datei vorhanden." };
  }

  const sorted = [...new Set(verseNums)].sort((a, b) => a - b);
  let ref: string;
  if (sorted.length === 1) ref = `${bookName} ${chapter}:${sorted[0]}`;
  else {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const contiguous = sorted.length === last - first + 1;
    ref = contiguous
      ? `${bookName} ${chapter}:${first}–${last}`
      : `${bookName} ${chapter}:${sorted.join(", ")}`;
  }

  let text = lines.join("\n");
  if (missing.length) {
    text += `\n\n(Fehlend in dieser Übersetzung: Vers ${missing.join(", ")}.)`;
  }

  return {
    label: safe.replace(/\.txt$/i, ""),
    reference: ref,
    text,
  };
}
