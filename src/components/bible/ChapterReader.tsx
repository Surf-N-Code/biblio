"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "vaul";
import { AiMarkdownModal } from "@/components/bible/AiMarkdownModal";
import { cn } from "@/lib/utils/cn";
import type { ParsedVerse } from "@/lib/bible/parse-chapter-html";
import {
  addVerseNote,
  type VerseNoteAiKind,
} from "@/lib/bible/reading-storage";

const HIGHLIGHT_PRESETS = [
  { id: "yellow", label: "Gelb", className: "bg-amber-200/90 dark:bg-amber-900/50" },
  { id: "green", label: "Grün", className: "bg-emerald-200/90 dark:bg-emerald-900/50" },
  { id: "blue", label: "Blau", className: "bg-sky-200/90 dark:bg-sky-900/50" },
  { id: "rose", label: "Rosa", className: "bg-rose-200/90 dark:bg-rose-900/50" },
] as const;

type HighlightMap = Record<number, string>;

type Snippet = {
  id: string;
  reference: string;
  text: string;
  createdAt: number;
};

function formatReference(bookName: string, chapter: number, verseNums: number[]): string {
  const s = [...new Set(verseNums)].sort((a, b) => a - b);
  if (s.length === 0) return `${bookName} ${chapter}`;
  if (s.length === 1) return `${bookName} ${chapter}:${s[0]}`;
  const first = s[0];
  const last = s[s.length - 1];
  const contiguous = s.length === last - first + 1;
  if (contiguous) return `${bookName} ${chapter}:${first}–${last}`;
  return `${bookName} ${chapter}:${s.join(", ")}`;
}

function buildPassage(primary: ParsedVerse[], selected: Set<number>): string {
  const nums = [...selected].sort((a, b) => a - b);
  const lines: string[] = [];
  for (const n of nums) {
    const row = primary.find((v) => v.verse === n);
    if (row) lines.push(`${row.verse} ${row.text}`);
  }
  return lines.join("\n");
}

function loadHighlights(key: string): HighlightMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as HighlightMap;
  } catch {
    return {};
  }
}

function saveHighlights(key: string, map: HighlightMap) {
  localStorage.setItem(key, JSON.stringify(map));
}

function loadSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem("biblio-snippets");
    if (!raw) return [];
    return JSON.parse(raw) as Snippet[];
  } catch {
    return [];
  }
}

function saveSnippets(items: Snippet[]) {
  localStorage.setItem("biblio-snippets", JSON.stringify(items.slice(0, 200)));
}

/** Default German text file in `data/bibles` (Luther 1912). */
const DEFAULT_GERMAN_BIBLE_FILE = "de_luther1912.txt";

function IconCopy(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.793-2.023 1.839-.088.738.054 1.46.449 2.101.36.59.85 1.093 1.438 1.406A2.25 2.25 0 0 1 6 7.228V19.5a2.25 2.25 0 0 0 2.25 2.25h9.75A2.25 2.25 0 0 0 20 19.5V9.75a2.25 2.25 0 0 0-2.25-2.25h-.584m0 0A2.251 2.251 0 0 0 15.75 4.5h-1.5a2.251 2.251 0 0 0-2.15 1.586m0 0V6a2.25 2.25 0 0 0 2.25 2.25h1.5"
      />
    </svg>
  );
}

function IconBookmarkSave(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  );
}

function IconLanguageDe(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138v.002c0 1.007-.116 1.998-.347 2.964M6 21h12" />
    </svg>
  );
}

function IconBoltBrief(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

function IconBookLong(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v15.128A9.114 9.114 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 0-6-2.292c-1.052 0-2.062.18-3 .512v15.128a8.966 8.966 0 0 0 6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function IconContext(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <circle cx="12" cy="12" r="8.25" />
    </svg>
  );
}

const toolbarIconBtnClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900";

/** `flex` (not inline-flex) keeps a stable box inside scrollable flex rows; min size matches touch targets. */
const kiIconBtnClass =
  "box-border flex h-14 min-h-14 w-14 min-w-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 p-0 leading-none text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200";

export type ChapterReaderProps = {
  bookName: string;
  bookSlug: string;
  usfm: string;
  chapter: number;
  primary: ParsedVerse[];
  amplified: ParsedVerse[] | null;
  storageKey: string;
  /** Local Matthew Henry HTML pack available for this book+chapter */
  hasMatthewHenry: boolean;
};

export function ChapterReader({
  bookName,
  bookSlug,
  usfm,
  chapter,
  primary,
  amplified,
  storageKey,
  hasMatthewHenry,
}: ChapterReaderProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [highlights, setHighlights] = useState<HighlightMap>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiPanel, setAiPanel] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mhText, setMhText] = useState<string | null>(null);
  const [mhLoading, setMhLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [lastAiKind, setLastAiKind] = useState<VerseNoteAiKind | undefined>();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const prevAiLoading = useRef<string | null>(null);

  useEffect(() => {
    setHighlights(loadHighlights(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (prevAiLoading.current && aiLoading === null && aiPanel?.trim()) {
      setAiModalOpen(true);
    }
    prevAiLoading.current = aiLoading;
  }, [aiLoading, aiPanel]);

  useEffect(() => {
    if (selected.size === 0) setDrawerOpen(false);
  }, [selected.size]);

  const selectedVersesKey = useMemo(
    () =>
      [...selected]
        .sort((a, b) => a - b)
        .join(","),
    [selected],
  );

  useEffect(() => {
    if (!hasMatthewHenry || selected.size === 0) {
      setMhText(null);
      setMhLoading(false);
      return;
    }
    const controller = new AbortController();
    setMhLoading(true);
    const verses = [...selected]
      .sort((a, b) => a - b)
      .join(",");
    const q = new URLSearchParams({
      usfm,
      chapter: String(chapter),
      verses,
    });
    fetch(`/api/commentary/matthew-henry?${q.toString()}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<{ text?: string }>)
      .then((j) => setMhText((j.text ?? "").trim() || null))
      .catch(() => setMhText(null))
      .finally(() => setMhLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedVersesKey encodes verse selection
  }, [hasMatthewHenry, usfm, chapter, selectedVersesKey]);

  const ampByVerse = useMemo(() => {
    if (!amplified?.length) return null;
    return new Map(amplified.map((v) => [v.verse, v.text]));
  }, [amplified]);

  const toggleVerse = useCallback((verseNum: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum);
      else next.add(verseNum);
      return next;
    });
  }, []);

  const reference = useMemo(
    () => formatReference(bookName, chapter, [...selected]),
    [bookName, chapter, selected],
  );

  const passageText = useMemo(
    () => buildPassage(primary, selected),
    [primary, selected],
  );

  const applyHighlight = (colorId: string) => {
    setHighlights((prev) => {
      const next = { ...prev };
      for (const v of selected) next[v] = colorId;
      saveHighlights(storageKey, next);
      return next;
    });
    setToast("Hervorhebung gespeichert.");
    window.setTimeout(() => setToast(null), 2000);
  };

  const copySelection = async () => {
    try {
      await navigator.clipboard.writeText(`${reference}\n\n${passageText}`);
      setToast("Kopiert.");
      window.setTimeout(() => setToast(null), 2000);
    } catch {
      setToast("Kopieren fehlgeschlagen.");
    }
  };

  const saveSnippet = () => {
    const items = loadSnippets();
    const item: Snippet = {
      id: crypto.randomUUID(),
      reference,
      text: passageText,
      createdAt: Date.now(),
    };
    items.unshift(item);
    saveSnippets(items);
    setToast("Snippet gespeichert.");
    window.setTimeout(() => setToast(null), 2000);
  };

  const runGermanPassage = async () => {
    setLastAiKind("german");
    setAiLoading("german");
    setAiPanel(null);
    try {
      const res = await fetch("/api/bible/german/passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: DEFAULT_GERMAN_BIBLE_FILE,
          usfm,
          chapter,
          verses: selectedVersesKey,
        }),
      });
      const json = (await res.json()) as {
        text?: string;
        label?: string;
        reference?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      const header = [json.label, json.reference].filter(Boolean).join(" · ");
      const body = json.text ?? "";
      setAiPanel(header ? `${header}\n\n${body}` : body);
    } catch (e) {
      setAiPanel(
        e instanceof Error ? e.message : "Deutscher Text konnte nicht geladen werden.",
      );
    } finally {
      setAiLoading(null);
    }
  };

  const runExplain = async (detail: "brief" | "extensive") => {
    setLastAiKind(detail === "brief" ? "explain-brief" : "explain-long");
    setAiLoading(detail === "brief" ? "explain-brief" : "explain-long");
    setAiPanel(null);
    try {
      const res = await fetch("/api/bible/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          passage: passageText,
          detail,
        }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setAiPanel(json.text ?? "");
    } catch (e) {
      setAiPanel(e instanceof Error ? e.message : "Erklärung fehlgeschlagen.");
    } finally {
      setAiLoading(null);
    }
  };

  const runContext = async () => {
    setLastAiKind("context");
    setAiLoading("context");
    setAiPanel(null);
    try {
      let mhForContext: string | undefined = mhText ?? undefined;
      if (hasMatthewHenry && selected.size > 0 && !mhForContext) {
        const verses = [...selected]
          .sort((a, b) => a - b)
          .join(",");
        const q = new URLSearchParams({ usfm, chapter: String(chapter), verses });
        const r = await fetch(`/api/commentary/matthew-henry?${q.toString()}`);
        const j = (await r.json()) as { text?: string };
        const t = (j.text ?? "").trim();
        mhForContext = t || undefined;
      }
      const res = await fetch("/api/bible/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          passage: passageText,
          ...(mhForContext ? { matthewHenryExcerpt: mhForContext } : {}),
        }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setAiPanel(json.text ?? "");
    } catch (e) {
      setAiPanel(e instanceof Error ? e.message : "Kontext fehlgeschlagen.");
    } finally {
      setAiLoading(null);
    }
  };

  const selectedVerseNums = useMemo(
    () => [...selected].sort((a, b) => a - b),
    [selected],
  );

  const saveUserNoteFromDrawer = () => {
    const body = noteDraft.trim();
    if (!body) {
      setToast("Bitte Notiztext eingeben.");
      window.setTimeout(() => setToast(null), 2000);
      return;
    }
    addVerseNote({
      usfm,
      bookSlug,
      bookName,
      chapter,
      verses: selectedVerseNums,
      body,
      source: "user",
    });
    setNoteDraft("");
    setToast("Notiz gespeichert.");
    window.setTimeout(() => setToast(null), 2000);
  };

  const saveAiPanelAsNote = () => {
    const body = aiPanel?.trim();
    if (!body) return;
    addVerseNote({
      usfm,
      bookSlug,
      bookName,
      chapter,
      verses: selectedVerseNums,
      body,
      source: "ai",
      aiKind: lastAiKind ?? "other",
    });
    setToast("KI-Notiz gespeichert.");
    window.setTimeout(() => setToast(null), 2000);
  };

  const highlightClassForVerse = (verseNum: number): string | undefined => {
    const id = highlights[verseNum];
    if (!id) return undefined;
    return HIGHLIGHT_PRESETS.find((h) => h.id === id)?.className;
  };

  const showSelectionBar = selected.size > 0 && !drawerOpen;

  return (
    <div className="w-full">
      {showSelectionBar && (
        <div
          className="fixed z-30 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-950/95 left-4 right-4 max-w-lg mx-auto"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            {selected.size === 1
              ? "1 Vers — weitere wählen oder Werkzeuge öffnen."
              : `${selected.size} Verse ausgewählt — Werkzeuge öffnen.`}
          </p>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Werkzeuge
          </button>
        </div>
      )}

      <div
        className={cn(
          "grid gap-6 lg:gap-10",
          ampByVerse ? "lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        <section aria-label="Primärtext">
          <h2 className="sr-only">Primärtext</h2>
          <div className="space-y-1 text-base leading-relaxed">
            {primary.map((v) => {
              const selectedRow = selected.has(v.verse);
              const hl = highlightClassForVerse(v.verse);
              return (
                <button
                  key={v.verse}
                  type="button"
                  data-verse={v.verse}
                  onClick={() => toggleVerse(v.verse)}
                  className={cn(
                    "flex w-full gap-2 rounded-md px-1 py-1.5 text-left transition-colors",
                    hl,
                    selectedRow && "ring-2 ring-zinc-400 dark:ring-zinc-500",
                    !hl && selectedRow && "bg-zinc-200/80 dark:bg-zinc-800/80",
                    !hl && !selectedRow && "hover:bg-zinc-100 dark:hover:bg-zinc-900/80",
                  )}
                  aria-pressed={selectedRow}
                >
                  <sup className="shrink-0 min-w-[1.75rem] text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {v.verse}
                  </sup>
                  <span className="flex-1">{v.text}</span>
                </button>
              );
            })}
          </div>
        </section>

        {ampByVerse && (
          <section aria-label="Amplified">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Amplified (falls verfügbar)
            </h2>
            <div className="space-y-1 text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
              {primary.map((v) => {
                const t = ampByVerse.get(v.verse);
                return (
                  <p key={`amp-${v.verse}`} className="flex gap-2">
                    <sup className="shrink-0 min-w-[1.75rem] text-xs font-semibold text-zinc-400 tabular-nums">
                      {v.verse}
                    </sup>
                    <span className="flex-1">{t ?? "—"}</span>
                  </p>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <Drawer.Root
        shouldScaleBackground={false}
        open={drawerOpen && selected.size > 0}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelected(new Set());
            setAiPanel(null);
            setAiModalOpen(false);
            setMhText(null);
            setNoteDraft("");
          }
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[96vh] min-h-0 flex-col overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl dark:border-zinc-800 dark:bg-zinc-950 max-sm:min-h-[80vh] sm:max-h-[88vh] sm:p-4 sm:pb-8">
            <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <Drawer.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Ausgewählte Verse
            </Drawer.Title>
            <Drawer.Description className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {reference}
            </Drawer.Description>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
              {HIGHLIGHT_PRESETS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => applyHighlight(h.id)}
                  aria-label={`Markierung: ${h.label}`}
                  title={h.label}
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-full ring-2 ring-zinc-400 ring-offset-2 ring-offset-white dark:ring-zinc-500 dark:ring-offset-zinc-950 sm:h-8 sm:w-8",
                    h.className,
                  )}
                />
              ))}
              <span className="mx-1 hidden h-6 w-px shrink-0 bg-zinc-200 sm:mx-2 sm:inline dark:bg-zinc-700" aria-hidden />
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={copySelection}
                  className={toolbarIconBtnClass}
                  aria-label="Auswahl kopieren"
                  title="Kopieren"
                >
                  <IconCopy className="h-[1.125rem] w-[1.125rem]" />
                </button>
                <button
                  type="button"
                  onClick={saveSnippet}
                  className={toolbarIconBtnClass}
                  aria-label="Snippet speichern"
                  title="Snippet speichern"
                >
                  <IconBookmarkSave className="h-[1.125rem] w-[1.125rem]" />
                </button>
                <button
                  type="button"
                  onClick={runGermanPassage}
                  disabled={!!aiLoading}
                  className={toolbarIconBtnClass}
                  aria-label="Ausgewählte Verse in deutscher Bibel (Luther 1912) anzeigen"
                  title="Deutsch · Luther 1912"
                >
                  {aiLoading === "german" ? (
                    <span className="text-xs font-semibold tabular-nums">…</span>
                  ) : (
                    <IconLanguageDe className="h-[1.125rem] w-[1.125rem]" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-3 flex min-h-14 flex-nowrap items-center justify-start gap-2 overflow-x-auto py-1">
              <button
                type="button"
                onClick={() => runExplain("brief")}
                disabled={!!aiLoading}
                className={kiIconBtnClass}
                aria-label="KI: kurz erklären"
                title="KI: kurz erklären"
              >
                {aiLoading === "explain-brief" ? (
                  <span className="text-sm font-semibold">…</span>
                ) : (
                  <IconBoltBrief className="h-4 w-4 shrink-0" />
                )}
              </button>
              <button
                type="button"
                onClick={() => runExplain("extensive")}
                disabled={!!aiLoading}
                className={kiIconBtnClass}
                aria-label="KI: ausführlich erklären"
                title="KI: ausführlich erklären"
              >
                {aiLoading === "explain-long" ? (
                  <span className="text-sm font-semibold">…</span>
                ) : (
                  <IconBookLong className="h-4 w-4 shrink-0" />
                )}
              </button>
              <button
                type="button"
                onClick={runContext}
                disabled={!!aiLoading}
                className={kiIconBtnClass}
                aria-label="Mehr Kontext"
                title="Mehr Kontext"
              >
                {aiLoading === "context" ? (
                  <span className="text-sm font-semibold">…</span>
                ) : (
                  <IconContext className="h-4 w-4 shrink-0" />
                )}
              </button>
            </div>

            {hasMatthewHenry && (
              <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-semibold">Matthew Henry (zu deiner Auswahl)</p>
                {mhLoading && (
                  <p className="mt-2 text-amber-800/90 dark:text-amber-200/90">Lade …</p>
                )}
                {!mhLoading && mhText && (
                  <p className="mt-2 whitespace-pre-wrap">{mhText}</p>
                )}
                {!mhLoading && !mhText && (
                  <p className="mt-2 text-amber-800/90 dark:text-amber-200/90">
                    Kein Auszug geladen — bitte Auswahl erneut antippen.
                  </p>
                )}
              </div>
            )}

            {aiLoading && (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
                KI-Antwort wird geladen …
              </p>
            )}
            {aiPanel && !aiLoading && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
                <p className="min-w-0 flex-1 text-sm text-zinc-600 dark:text-zinc-300">
                  KI-Antwort ist bereit (Markdown).
                </p>
                <button
                  type="button"
                  onClick={() => setAiModalOpen(true)}
                  className="shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Im Fenster anzeigen
                </button>
              </div>
            )}

            <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Notizen zu dieser Auswahl
              </p>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                placeholder="Eigene Notiz …"
                className="w-full min-h-[7.5rem] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 sm:min-h-0"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveUserNoteFromDrawer}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                >
                  Eigene Notiz speichern
                </button>
                {aiPanel && !aiLoading && (
                  <button
                    type="button"
                    onClick={saveAiPanelAsNote}
                    className="rounded-full border border-emerald-600 px-3 py-1.5 text-sm text-emerald-800 dark:border-emerald-500 dark:text-emerald-200"
                  >
                    KI-Text als Notiz speichern
                  </button>
                )}
              </div>
            </div>

            {toast && (
              <p className="mt-3 text-center text-sm text-emerald-700 dark:text-emerald-400" role="status">
                {toast}
              </p>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <AiMarkdownModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        markdown={aiPanel}
      />
    </div>
  );
}
