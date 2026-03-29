"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CANONICAL_BOOKS } from "@/lib/bible/canonical-books";
import {
  getReadChapterKeys,
  getReadingStats,
  TOTAL_BIBLE_CHAPTERS,
} from "@/lib/bible/reading-storage";
import { ReadSubNav } from "@/components/bible/ReadSubNav";

export default function ReadFortschrittPage() {
  const [stats, setStats] = useState(() =>
    typeof window === "undefined"
      ? { readChapters: 0, totalChapters: TOTAL_BIBLE_CHAPTERS, percent: 0 }
      : getReadingStats(),
  );
  const [readKeys, setReadKeys] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      setStats(getReadingStats());
      setReadKeys(getReadChapterKeys());
    };
    sync();
    window.addEventListener("biblio-read-changed", sync);
    return () => window.removeEventListener("biblio-read-changed", sync);
  }, []);

  const readSet = useMemo(() => new Set(readKeys), [readKeys]);

  const booksWithProgress = useMemo(() => {
    return CANONICAL_BOOKS.map((book) => {
      let readInBook = 0;
      for (let c = 1; c <= book.chapters; c++) {
        const k = `${book.usfm}:${c}`;
        if (readSet.has(k)) readInBook += 1;
      }
      const pct =
        book.chapters > 0
          ? Math.round((readInBook / book.chapters) * 1000) / 10
          : 0;
      return { book, readInBook, pct };
    });
  }, [readSet]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ReadSubNav current="fortschritt" />
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Lesefortschritt
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Markierte Kapitel zählen für die Statistik. Die Daten liegen nur in diesem Browser (localStorage).
      </p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Gesamt (protestantischer Kanon)</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {stats.readChapters}{" "}
          <span className="text-lg font-normal text-zinc-500">/ {stats.totalChapters}</span>
        </p>
        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="progressbar"
          aria-valuenow={Math.round(stats.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Anteil gelesener Kapitel"
        >
          <div
            className="h-full rounded-full bg-emerald-600 transition-[width] dark:bg-emerald-500"
            style={{ width: `${Math.min(100, stats.percent)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <strong className="text-zinc-900 dark:text-zinc-100">{stats.percent}%</strong> der Bibel
          (nach Kapiteln)
        </p>
      </div>

      <section className="mt-10" aria-labelledby="per-book-heading">
        <h2 id="per-book-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Pro Buch
        </h2>
        <ul className="mt-4 space-y-2">
          {booksWithProgress.map(({ book, readInBook, pct }) => (
            <li
              key={book.usfm}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950/60"
            >
              <Link
                href={`/read/${book.slug}`}
                className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-100"
              >
                {book.name}
              </Link>
              <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                {readInBook}/{book.chapters} ({pct}%)
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm">
        <Link href="/read" className="text-zinc-700 underline underline-offset-2 dark:text-zinc-300">
          ← Zur Bücherliste
        </Link>
      </p>
    </div>
  );
}
