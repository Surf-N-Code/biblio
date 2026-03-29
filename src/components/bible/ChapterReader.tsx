"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils/cn";
import type { ParsedVerse } from "@/lib/bible/parse-chapter-html";

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

const GERMAN_BIBLE_FILE_KEY = "biblio-german-bible-file";

function loadGermanBibleFilePreference(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(GERMAN_BIBLE_FILE_KEY);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

function saveGermanBibleFilePreference(basename: string) {
  localStorage.setItem(GERMAN_BIBLE_FILE_KEY, basename);
}

export type ChapterReaderProps = {
  bookName: string;
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
  const [germanFiles, setGermanFiles] = useState<{ id: string; label: string }[]>([]);
  const [germanFile, setGermanFile] = useState<string>("");

  useEffect(() => {
    setHighlights(loadHighlights(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/bible/german/list", { signal: controller.signal })
      .then((r) => r.json() as Promise<{ files?: { id: string; label: string }[] }>)
      .then((j) => {
        const files = j.files ?? [];
        setGermanFiles(files);
        const saved = loadGermanBibleFilePreference();
        const fallback =
          files.find((f) => f.id === "de_luther1912.txt")?.id ?? files[0]?.id ?? "";
        const pick =
          saved && files.some((f) => f.id === saved) ? saved : fallback;
        setGermanFile(pick);
      })
      .catch(() => {
        setGermanFiles([]);
        setGermanFile("");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDrawerOpen(selected.size > 0);
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
    if (!germanFile) {
      setAiPanel(
        "Keine deutsche Bibel-Datei (de_*.txt) im Ordner data/bibles gefunden.",
      );
      return;
    }
    setAiLoading("german");
    setAiPanel(null);
    try {
      const res = await fetch("/api/bible/german/passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: germanFile,
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

  const highlightClassForVerse = (verseNum: number): string | undefined => {
    const id = highlights[verseNum];
    if (!id) return undefined;
    return HIGHLIGHT_PRESETS.find((h) => h.id === id)?.className;
  };

  return (
    <div className="w-full">
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
        open={drawerOpen && selected.size > 0}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelected(new Set());
            setAiPanel(null);
            setMhText(null);
          }
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl border border-zinc-200 bg-white p-4 pb-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <Drawer.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Ausgewählte Verse
            </Drawer.Title>
            <Drawer.Description className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {reference}
            </Drawer.Description>

            <div className="mt-4 flex flex-wrap gap-2">
              {HIGHLIGHT_PRESETS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => applyHighlight(h.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-zinc-300 dark:ring-zinc-600",
                    h.className,
                  )}
                >
                  {h.label}
                </button>
              ))}
              <button
                type="button"
                onClick={copySelection}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
              >
                Kopieren
              </button>
              <button
                type="button"
                onClick={saveSnippet}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
              >
                Snippet speichern
              </button>
              {germanFiles.length > 0 && (
                <label className="flex w-full min-w-[12rem] flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400 sm:w-auto">
                  <span className="sr-only">Deutsche Bibel-Datei</span>
                  <select
                    value={germanFile}
                    onChange={(e) => {
                      const v = e.target.value;
                      setGermanFile(v);
                      if (v) saveGermanBibleFilePreference(v);
                    }}
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {germanFiles.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={runGermanPassage}
                disabled={!!aiLoading || !germanFile}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 disabled:opacity-50"
              >
                {aiLoading === "german" ? "…" : "Deutsche Bibel"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runExplain("brief")}
                disabled={!!aiLoading}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
              >
                {aiLoading === "explain-brief" ? "…" : "KI: kurz erklären"}
              </button>
              <button
                type="button"
                onClick={() => runExplain("extensive")}
                disabled={!!aiLoading}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
              >
                {aiLoading === "explain-long" ? "…" : "KI: ausführlich erklären"}
              </button>
              <button
                type="button"
                onClick={runContext}
                disabled={!!aiLoading}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
              >
                {aiLoading === "context" ? "…" : "Mehr Kontext"}
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

            {aiPanel && (
              <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                {aiPanel}
              </div>
            )}

            {toast && (
              <p className="mt-3 text-center text-sm text-emerald-700 dark:text-emerald-400" role="status">
                {toast}
              </p>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
