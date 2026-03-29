"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addVerseNote,
  deleteVerseNote,
  getNotesForChapter,
  updateVerseNote,
  type VerseNote,
} from "@/lib/bible/reading-storage";

function parseVersesInput(s: string): number[] {
  const out = new Set<number>();
  for (const part of s.split(/[,\s]+/).filter(Boolean)) {
    const range = /^(\d+)\s*[-–]\s*(\d+)$/.exec(part);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        if (i > 0) out.add(i);
      }
    } else if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (n > 0) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}

function formatVersesLabel(verses: number[]): string {
  if (verses.length === 0) return "ganzes Kapitel";
  if (verses.length === 1) return `Vers ${verses[0]}`;
  const first = verses[0];
  const last = verses[verses.length - 1];
  const contiguous = verses.length === last - first + 1;
  if (contiguous) return `Vers ${first}–${last}`;
  return `Vers ${verses.join(", ")}`;
}

const AI_KIND_DE: Record<string, string> = {
  "explain-brief": "KI kurz",
  "explain-long": "KI ausführlich",
  context: "KI Kontext",
  german: "Deutsche Bibel",
  "matthew-henry": "Matthew Henry",
  other: "KI",
};

type ChapterNotesPanelProps = {
  usfm: string;
  bookSlug: string;
  bookName: string;
  chapter: number;
};

export function ChapterNotesPanel({
  usfm,
  bookSlug,
  bookName,
  chapter,
}: ChapterNotesPanelProps) {
  const [notes, setNotes] = useState<VerseNote[]>([]);
  const [draftVerses, setDraftVerses] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const refresh = useCallback(() => {
    setNotes(getNotesForChapter(usfm, chapter));
  }, [usfm, chapter]);

  useEffect(() => {
    refresh();
    window.addEventListener("biblio-notes-changed", refresh);
    return () => window.removeEventListener("biblio-notes-changed", refresh);
  }, [refresh]);

  const submitNew = () => {
    const body = draftBody.trim();
    if (!body) return;
    const verses = parseVersesInput(draftVerses);
    addVerseNote({
      usfm,
      bookSlug,
      bookName,
      chapter,
      verses,
      body,
      source: "user",
    });
    setDraftVerses("");
    setDraftBody("");
    refresh();
  };

  const startEdit = (n: VerseNote) => {
    setEditingId(n.id);
    setEditBody(n.body);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateVerseNote(editingId, editBody);
    setEditingId(null);
    refresh();
  };

  const remove = (id: string) => {
    deleteVerseNote(id);
    refresh();
  };

  return (
    <section
      className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
      aria-labelledby="chapter-notes-heading"
    >
      <h2
        id="chapter-notes-heading"
        className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Notizen zu diesem Kapitel
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Eigene Notizen und gespeicherte KI-Antworten erscheinen hier. Sie bleiben nur in diesem
        Browser gespeichert.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="note-verses" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Verse (optional, z. B. „3“ oder „1, 5–7“) — leer = ganzes Kapitel
          </label>
          <input
            id="note-verses"
            type="text"
            value={draftVerses}
            onChange={(e) => setDraftVerses(e.target.value)}
            placeholder="z. B. 3 oder 1–5"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label htmlFor="note-body" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Notiz
          </label>
          <textarea
            id="note-body"
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            rows={3}
            placeholder="Deine Gedanken …"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <button
          type="button"
          onClick={submitNew}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Notiz speichern
        </button>
      </div>

      {notes.length > 0 && (
        <ul className="mt-6 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/80"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-zinc-800 dark:text-zinc-100">
                  {formatVersesLabel(n.verses)}
                </span>
                <span className="text-xs text-zinc-500">
                  {n.source === "ai"
                    ? (n.aiKind && AI_KIND_DE[n.aiKind]) || "KI"
                    : "Du"}
                </span>
              </div>
              {editingId === n.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={4}
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                    {n.body}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(n)}
                      className="text-xs text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      className="text-xs text-red-600 underline underline-offset-2 dark:text-red-400"
                    >
                      Löschen
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
