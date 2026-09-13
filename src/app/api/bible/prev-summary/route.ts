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
  try {
    const summary = await getPreviousChaptersContext(usfm, slug, chapter, lang);
    return NextResponse.json({ summary });
  } catch (error) {
    // Log the provider status without credentials, response headers, or prompt text.
    const status =
      typeof error === "object" && error !== null && "status" in error &&
      typeof error.status === "number" ? error.status : undefined;
    const code =
      typeof error === "object" && error !== null && "code" in error &&
      typeof error.code === "string" && /^[a-z_]+$/.test(error.code)
        ? error.code : undefined;
    console.error("[prev-summary] Context generation unavailable", { status, code });
    return NextResponse.json(
      { error: "Kontext ist vorübergehend nicht verfügbar. Bitte versuche es später erneut." },
      { status: 503 },
    );
  }
}
