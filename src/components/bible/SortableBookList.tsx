"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CANONICAL_BOOKS, type CanonicalBook } from "@/lib/bible/canonical-books";
import { cn } from "@/lib/utils/cn";

type SortMode = "canonical" | "alpha";

function sortBooks(mode: SortMode): CanonicalBook[] {
  if (mode === "canonical") return CANONICAL_BOOKS;
  return [...CANONICAL_BOOKS].sort((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
  );
}

export function SortableBookList() {
  const [sort, setSort] = useState<SortMode>("canonical");
  const books = useMemo(() => sortBooks(sort), [sort]);

  return (
    <div>
      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Sortierung der Bücher"
      >
        <button
          type="button"
          onClick={() => setSort("canonical")}
          aria-pressed={sort === "canonical"}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            sort === "canonical"
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-300 bg-transparent text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800",
          )}
        >
          Bibelreihenfolge
        </button>
        <button
          type="button"
          onClick={() => setSort("alpha")}
          aria-pressed={sort === "alpha"}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            sort === "alpha"
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-300 bg-transparent text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800",
          )}
        >
          Alphabetisch
        </button>
      </div>

      <ul className="mt-6 columns-1 gap-x-8 sm:columns-2">
        {books.map((b) => (
          <li key={b.slug} className="mb-2 break-inside-avoid">
            <Link
              href={`/read/${b.slug}`}
              className="text-zinc-800 underline underline-offset-2 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-100"
            >
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
