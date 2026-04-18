import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookChapterGrid } from "@/components/bible/BookChapterGrid";
import { ReadSubNav } from "@/components/bible/ReadSubNav";
import { getBookBySlug } from "@/lib/bible/canonical-books";
import { getBibleReadLangFromCookies } from "@/lib/bible/read-language-server";

type PageProps = {
  params: Promise<{ bookId: string }>;
};

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId } = await params;
  const book = getBookBySlug(bookId);
  if (!book) {
    return { title: "Biblio" };
  }
  const title = `${book.name} – Kapitel – Biblio`;
  const url = `${siteBase()}/read/${book.slug}`;
  return {
    title,
    description: `Alle Kapitel von ${book.name} — schnell zu einem Kapitel springen.`,
    alternates: { canonical: url },
    openGraph: { title, url },
  };
}

export default async function ReadBookChaptersPage({ params }: PageProps) {
  const { bookId } = await params;
  const book = getBookBySlug(bookId);
  if (!book) {
    notFound();
  }

  const bibleLang = await getBibleReadLangFromCookies();

  const canonical = `${siteBase()}/read/${book.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${book.name} – Kapitel`,
    url: canonical,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-5xl px-4 py-10">
        <ReadSubNav bibleLang={bibleLang} />
        <nav className="mb-6 text-sm text-zinc-600 dark:text-zinc-400" aria-label="Brotkrumen">
          <Link href="/read" className="underline underline-offset-2">
            Lesen
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900 dark:text-zinc-100">{book.name}</span>
        </nav>

        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {book.name}
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Wähle ein Kapitel ({book.chapters} Kapitel).
          </p>
        </header>

        <BookChapterGrid bookSlug={book.slug} chapterCount={book.chapters} />

        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-500">
          <Link
            href="/read"
            className="text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
          >
            ← Zurück zur Bücherliste
          </Link>
        </p>
      </article>
    </>
  );
}
