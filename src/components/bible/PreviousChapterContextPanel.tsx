"use client";

import { useEffect, useState } from "react";

type Props = {
  usfm: string;
  bookSlug: string;
  chapter: number;
};

export function PreviousChapterContextPanel({
  usfm,
  bookSlug,
  chapter,
}: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    const q = new URLSearchParams({
      usfm,
      slug: bookSlug,
      chapter: String(chapter),
    });

    fetch(`/api/bible/prev-summary?${q}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<{ summary?: string | null }>;
      })
      .then((data) => {
        if (cancelled) return;
        const text = data.summary;
        setSummary(
          typeof text === "string" && text.trim().length > 0 ? text : null,
        );
        setPhase("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setPhase("error");
        setSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [usfm, bookSlug, chapter]);

  if (phase === "ready" && !summary) return null;
  if (phase === "error") {
    return (
      <aside
        className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
        role="status"
      >
        <p>Kontext aus vorherigen Kapiteln konnte nicht geladen werden.</p>
      </aside>
    );
  }

  return (
    <aside
      className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200"
      aria-busy={phase === "loading"}
    >
      <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
        Kontext aus vorherigen Kapiteln
      </h2>
      {phase === "loading" ? (
        <div className="mt-2 space-y-2" aria-hidden>
          <div className="h-3 w-full animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-700/80" />
          <div className="h-3 w-[92%] animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-700/80" />
          <div className="h-3 w-[78%] animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-700/80" />
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap">{summary}</p>
      )}
    </aside>
  );
}
