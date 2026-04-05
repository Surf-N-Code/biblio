"use client";

import { useEffect, useState } from "react";
import {
  initReadProgressSync,
  isChapterRead,
  toggleChapterRead,
} from "@/lib/bible/reading-storage";

type MarkChapterReadProps = {
  usfm: string;
  chapter: number;
};

export function MarkChapterRead({ usfm, chapter }: MarkChapterReadProps) {
  const [read, setRead] = useState(false);

  useEffect(() => {
    const sync = () => setRead(isChapterRead(usfm, chapter));
    void initReadProgressSync().then(sync);
    window.addEventListener("biblio-read-changed", sync);
    return () => window.removeEventListener("biblio-read-changed", sync);
  }, [usfm, chapter]);

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <input
        type="checkbox"
        checked={read}
        onChange={() => {
          const next = toggleChapterRead(usfm, chapter);
          setRead(next);
        }}
        className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900"
      />
      <span>Kapitel als gelesen markieren</span>
    </label>
  );
}
