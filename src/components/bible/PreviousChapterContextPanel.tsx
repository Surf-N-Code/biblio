"use client";

import { useCallback, useState } from "react";

type Props = {
  usfm: string;
  bookSlug: string;
  chapter: number;
};

type Phase = "idle" | "loading" | "ready" | "error";

export function PreviousChapterContextPanel({
  usfm,
  bookSlug,
  chapter,
}: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState(
    "Kontext aus vorherigen Kapiteln konnte nicht geladen werden.",
  );

  const loadSummary = useCallback(async () => {
    setPhase("loading");
    setErrorMessage("Kontext aus vorherigen Kapiteln konnte nicht geladen werden.");

    const q = new URLSearchParams({
      usfm,
      slug: bookSlug,
      chapter: String(chapter),
    });

    try {
      const res = await fetch(`/api/bible/prev-summary?${q}`, { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error || "Kontext aus vorherigen Kapiteln konnte nicht geladen werden.",
        );
      }
      const data = (await res.json()) as { summary?: string | null };
      const text = data.summary;
      setSummary(typeof text === "string" && text.trim().length > 0 ? text : null);
      setPhase("ready");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kontext aus vorherigen Kapiteln konnte nicht geladen werden.",
      );
      setPhase("error");
      setSummary(null);
    }
  }, [usfm, bookSlug, chapter]);

  if (phase === "ready" && !summary) return null;

  if (phase === "idle") {
    return (
      <aside className="mt-6">
        <button
          type="button"
          onClick={() => void loadSummary()}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Kontext aus vorherigem Kapitel laden
        </button>
      </aside>
    );
  }

  if (phase === "error") {
    return (
      <aside
        className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
        role="status"
      >
        <p>{errorMessage}</p>
        <button
          type="button"
          onClick={() => void loadSummary()}
          className="mt-3 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
        >
          Erneut versuchen
        </button>
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
