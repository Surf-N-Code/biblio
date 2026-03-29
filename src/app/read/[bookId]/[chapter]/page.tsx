import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterReader } from "@/components/bible/ChapterReader";
import { getBookBySlug } from "@/lib/bible/canonical-books";
import { loadAmplifiedChapter, loadPrimaryChapter } from "@/lib/bible/api";
import { getPreviousChaptersContext } from "@/lib/ai/prev-summary";
import { matthewHenryFileExists } from "@/lib/commentary/matthew-henry";

type PageProps = {
  params: Promise<{ bookId: string; chapter: string }>;
};

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId, chapter: chapterStr } = await params;
  const book = getBookBySlug(bookId);
  const chapter = Number(chapterStr);
  if (!book || !Number.isFinite(chapter)) {
    return { title: "Biblio" };
  }
  const title = `${book.name} ${chapter} – Biblio`;
  const url = `${siteBase()}/read/${book.slug}/${chapter}`;
  return {
    title,
    description: `Read ${book.name} chapter ${chapter} with study tools.`,
    alternates: { canonical: url },
    openGraph: { title, url },
  };
}

export default async function ReadChapterPage({ params }: PageProps) {
  const { bookId, chapter: chapterStr } = await params;
  const book = getBookBySlug(bookId);
  const chapter = Number(chapterStr);
  if (!book || !Number.isFinite(chapter) || chapter < 1 || chapter > book.chapters) {
    notFound();
  }

  const [primary, amplified, prevSummary] = await Promise.all([
    loadPrimaryChapter(book.usfm, book.slug, chapter),
    loadAmplifiedChapter(book.usfm, chapter),
    getPreviousChaptersContext(book.usfm, book.slug, chapter),
  ]);

  const hasMh = matthewHenryFileExists(book.usfm, chapter);
  const storageKey = `biblio-hl-${primary.source}-${book.usfm}-${chapter}`;
  const canonical = `${siteBase()}/read/${book.slug}/${chapter}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${book.name} ${chapter}`,
    url: canonical,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-5xl px-4 py-8">
        <nav className="mb-6 text-sm text-zinc-600 dark:text-zinc-400" aria-label="Brotkrumen">
          <Link href="/read" className="underline underline-offset-2">
            Lesen
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/read/${book.slug}`}
            className="underline underline-offset-2"
          >
            {book.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900 dark:text-zinc-100">{chapter}</span>
        </nav>
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {book.name} {chapter}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{primary.bibleLabel}</p>
        </header>

        {prevSummary && (
          <aside className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Kontext aus vorherigen Kapiteln
            </h2>
            <p className="mt-2 whitespace-pre-wrap">{prevSummary}</p>
          </aside>
        )}

        <div className="mt-8">
          <ChapterReader
            bookName={book.name}
            usfm={book.usfm}
            chapter={chapter}
            primary={primary.verses}
            amplified={amplified}
            storageKey={storageKey}
            hasMatthewHenry={hasMh}
          />
        </div>

        <nav
          className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800"
          aria-label="Kapitelnavigation"
        >
          {chapter > 1 ? (
            <Link
              href={`/read/${book.slug}/${chapter - 1}`}
              className="text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
            >
              ← Kapitel {chapter - 1}
            </Link>
          ) : (
            <span className="min-w-[1ch]" />
          )}
          <Link
            href={`/read/${book.slug}`}
            className="text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
          >
            Alle Kapitel
          </Link>
          {chapter < book.chapters ? (
            <Link
              href={`/read/${book.slug}/${chapter + 1}`}
              className="text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
            >
              Kapitel {chapter + 1} →
            </Link>
          ) : (
            <span className="min-w-[1ch]" />
          )}
        </nav>
      </article>
    </>
  );
}
