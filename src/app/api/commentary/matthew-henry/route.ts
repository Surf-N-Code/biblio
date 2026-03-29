import { NextResponse } from "next/server";
import { getMatthewHenryExcerptForVerses } from "@/lib/commentary/matthew-henry";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usfm = searchParams.get("usfm")?.trim();
  const chapterRaw = searchParams.get("chapter");
  const versesRaw = searchParams.get("verses")?.trim();

  if (!usfm || chapterRaw === null || !versesRaw) {
    return NextResponse.json({ error: "Missing usfm, chapter, or verses" }, { status: 400 });
  }

  const chapter = Number(chapterRaw);
  const verses = versesRaw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!Number.isFinite(chapter) || chapter < 1 || verses.length === 0) {
    return NextResponse.json({ error: "Invalid chapter or verses" }, { status: 400 });
  }

  const text = getMatthewHenryExcerptForVerses(usfm, chapter, verses);
  return NextResponse.json({ text: text ?? "" });
}
