"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getReadingStats,
  initReadProgressSync,
  TOTAL_BIBLE_CHAPTERS,
} from "@/lib/bible/reading-storage";

export function ReadingStatsInline() {
  const [stats, setStats] = useState(() =>
    typeof window === "undefined"
      ? { readChapters: 0, totalChapters: TOTAL_BIBLE_CHAPTERS, percent: 0 }
      : getReadingStats(),
  );

  useEffect(() => {
    const sync = () => setStats(getReadingStats());
    void initReadProgressSync().then(sync);
    window.addEventListener("biblio-read-changed", sync);
    return () => window.removeEventListener("biblio-read-changed", sync);
  }, []);

  return (
    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
      Gelesen:{" "}
      <strong className="text-zinc-900 dark:text-zinc-100">
        {stats.readChapters} / {stats.totalChapters} Kapitel
      </strong>{" "}
      ({stats.percent}%).{" "}
      <Link href="/read/fortschritt" className="underline underline-offset-2">
        Details
      </Link>
    </p>
  );
}
