import { NextResponse } from "next/server";
import { getBookByUsfm } from "@/lib/bible/canonical-books";
import { getGermanPassageForVerses } from "@/lib/bible/de-local";

export const runtime = "nodejs";

type Body = {
  file?: string;
  usfm?: string;
  chapter?: number;
  verses?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const file = typeof body.file === "string" ? body.file : "";
  const usfm = typeof body.usfm === "string" ? body.usfm.trim() : "";
  const chapter =
    typeof body.chapter === "number" && Number.isFinite(body.chapter)
      ? body.chapter
      : NaN;
  const versesRaw = typeof body.verses === "string" ? body.verses.trim() : "";

  if (!file || !usfm || !Number.isFinite(chapter) || chapter < 1 || !versesRaw) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const book = getBookByUsfm(usfm);
  if (!book) {
    return NextResponse.json({ error: "Unbekanntes Buch." }, { status: 400 });
  }

  const verseNums = versesRaw
    .split(/[,\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!verseNums.length) {
    return NextResponse.json({ error: "Keine Verse angegeben." }, { status: 400 });
  }

  const result = getGermanPassageForVerses(
    file,
    book.name,
    usfm,
    chapter,
    verseNums,
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result);
}
