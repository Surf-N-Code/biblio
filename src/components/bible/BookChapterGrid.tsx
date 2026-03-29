import Link from "next/link";

type BookChapterGridProps = {
  bookSlug: string;
  chapterCount: number;
};

/** Quick links to every chapter of a book (1 … chapterCount). */
export function BookChapterGrid({ bookSlug, chapterCount }: BookChapterGridProps) {
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

  return (
    <nav aria-label="Kapitel wählen">
      <ul className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
        {chapters.map((n) => (
          <li key={n}>
            <Link
              href={`/read/${bookSlug}/${n}`}
              className="flex min-h-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
            >
              {n}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
