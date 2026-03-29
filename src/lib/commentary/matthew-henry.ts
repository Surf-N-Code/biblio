import fs from "fs";
import path from "path";
import { getProtestantBookOrder } from "@/lib/bible/canonical-books";
import { extractMatthewHenryForVerses } from "./mh-extract";

function matthewHenryFilename(usfm: string, chapter: number): string | null {
  const order = getProtestantBookOrder(usfm);
  if (order < 1) return null;
  return `MHC${String(order).padStart(2, "0")}${String(chapter).padStart(3, "0")}.HTM`;
}

function defaultMatthewHenryDir(): string {
  return process.env.MATTHEW_HENRY_DIR?.trim() || path.join(process.cwd(), "data/matthew_henry");
}

export function matthewHenryHtmlPath(usfm: string, chapter: number): string | null {
  const filename = matthewHenryFilename(usfm, chapter);
  if (!filename) return null;
  return path.join(defaultMatthewHenryDir(), filename);
}

export function matthewHenryFileExists(usfm: string, chapter: number): boolean {
  const full = matthewHenryHtmlPath(usfm, chapter);
  return full ? fs.existsSync(full) : false;
}

/**
 * Commentary paragraphs relevant to the given verses (parsed from passage= links in the HTML).
 */
export function getMatthewHenryExcerptForVerses(
  usfm: string,
  chapter: number,
  verses: number[],
): string | null {
  const full = matthewHenryHtmlPath(usfm, chapter);
  if (!full || !fs.existsSync(full)) return null;
  const html = fs.readFileSync(full, "utf-8");
  const excerpt = extractMatthewHenryForVerses(html, usfm, chapter, verses);
  return excerpt.length > 0 ? excerpt : null;
}
