import { NextResponse } from "next/server";
import { getPreviousChaptersContext } from "@/lib/ai/prev-summary";

export const runtime = "nodejs";

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
  const summary = await getPreviousChaptersContext(usfm, slug, chapter);
  return NextResponse.json({ summary });
}
