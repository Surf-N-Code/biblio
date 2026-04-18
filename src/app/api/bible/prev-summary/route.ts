import { NextResponse } from "next/server";
import { getPreviousChaptersContext } from "@/lib/ai/prev-summary";
import { getBibleReadLangFromCookies } from "@/lib/bible/read-language-server";

export const runtime = "nodejs";

/** Public: same access as server-rendered chapter pages (cached in Redis when configured). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usfm = searchParams.get("usfm")?.trim();
  const slug = searchParams.get("slug")?.trim();
  const chapterRaw = searchParams.get("chapter");
  if (!usfm || !slug || chapterRaw === null) {
    return NextResponse.json({ error: "Missing usfm, slug, or chapter" }, { status: 400 });
  }
  const chapter = Number(chapterRaw);
  if (!Number.isFinite(chapter) || chapter < 1) {
    return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
  }
  const lang = await getBibleReadLangFromCookies();
  const summary = await getPreviousChaptersContext(usfm, slug, chapter, lang);
  return NextResponse.json({ summary });
}
