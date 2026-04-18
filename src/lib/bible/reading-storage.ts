import { CANONICAL_BOOKS } from "./canonical-books";

const READ_KEY = "biblio-read-chapters";
const READ_PROGRESS_OWNER_KEY = "biblio-read-progress-owner";
const NOTES_KEY = "biblio-verse-notes";
const MAX_NOTES = 2000;

let remoteReadProgressEnabled = false;
let readProgressSyncPromise: Promise<void> | null = null;
let remoteSaveTimer: ReturnType<typeof setTimeout> | undefined;

/** Protestant canon: total chapter count for progress. */
export const TOTAL_BIBLE_CHAPTERS = CANONICAL_BOOKS.reduce((s, b) => s + b.chapters, 0);

export function chapterStorageKey(usfm: string, chapter: number): string {
  return `${usfm.toUpperCase()}:${chapter}`;
}

export type VerseNoteAiKind =
  | "explain-brief"
  | "explain-long"
  | "context"
  | "german"
  | "matthew-henry"
  | "other";

export type VerseNote = {
  id: string;
  usfm: string;
  bookSlug: string;
  bookName: string;
  chapter: number;
  /** Empty = note refers to the whole chapter. */
  verses: number[];
  body: string;
  source: "user" | "ai";
  aiKind?: VerseNoteAiKind;
  createdAt: number;
  updatedAt: number;
};

function dispatchReadChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("biblio-read-changed"));
}

function loadReadProgressOwner(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(READ_PROGRESS_OWNER_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function saveReadProgressOwner(username: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(READ_PROGRESS_OWNER_KEY, username);
}

async function fetchReadProgressFromApi(): Promise<{
  synced: boolean;
  keys: string[];
  username?: string;
}> {
  const res = await fetch("/api/bible/read-progress", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return { synced: false, keys: [] };
  return res.json() as Promise<{
    synced: boolean;
    keys: string[];
    username?: string;
  }>;
}

async function pushReadProgressToApi(keys: string[]): Promise<void> {
  if (!remoteReadProgressEnabled) return;
  const unique = [...new Set(keys)].sort();
  await fetch("/api/bible/read-progress", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys: unique }),
    credentials: "include",
    cache: "no-store",
  });
}

function scheduleRemoteReadProgressSave(keys: string[]) {
  if (!remoteReadProgressEnabled) return;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(() => {
    void pushReadProgressToApi(keys);
  }, 400);
}

async function performReadProgressSync(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { synced, keys, username } = await fetchReadProgressFromApi();
    if (!synced) {
      remoteReadProgressEnabled = false;
      return;
    }
    remoteReadProgressEnabled = true;
    const local = loadReadArray();
    const storedOwner = loadReadProgressOwner();
    const accountSwitch =
      storedOwner !== "" && username !== undefined && storedOwner !== username;

    if (accountSwitch) {
      saveReadArray(keys, { skipRemote: true });
      if (username !== undefined) saveReadProgressOwner(username);
      return;
    }

    if (keys.length === 0 && local.length > 0) {
      await pushReadProgressToApi(local);
      if (username !== undefined) saveReadProgressOwner(username);
      return;
    }
    saveReadArray(keys, { skipRemote: true });
    if (username !== undefined) saveReadProgressOwner(username);
  } catch {
    remoteReadProgressEnabled = false;
  }
}

/**
 * When Redis is configured on the server, loads or migrates read progress once per page session.
 * Call from client components that depend on read state (e.g. in useEffect).
 */
export function initReadProgressSync(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!readProgressSyncPromise) {
    readProgressSyncPromise = performReadProgressSync();
  }
  return readProgressSyncPromise;
}

function dispatchNotesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("biblio-notes-changed"));
}

function loadReadArray(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function saveReadArray(
  keys: string[],
  opts?: { skipRemote?: boolean },
) {
  const sorted = [...new Set(keys)].sort();
  localStorage.setItem(READ_KEY, JSON.stringify(sorted));
  dispatchReadChanged();
  if (!opts?.skipRemote) {
    scheduleRemoteReadProgressSave(sorted);
  }
}

export function getReadChapterKeys(): string[] {
  return loadReadArray();
}

export function isChapterRead(usfm: string, chapter: number): boolean {
  const k = chapterStorageKey(usfm, chapter);
  return loadReadArray().includes(k);
}

/** Returns new read state (true = now marked read). */
export function toggleChapterRead(usfm: string, chapter: number): boolean {
  const k = chapterStorageKey(usfm, chapter);
  const arr = loadReadArray();
  const i = arr.indexOf(k);
  if (i >= 0) {
    arr.splice(i, 1);
    saveReadArray(arr);
    return false;
  }
  arr.push(k);
  saveReadArray(arr);
  return true;
}

export function setChapterRead(usfm: string, chapter: number, read: boolean) {
  const k = chapterStorageKey(usfm, chapter);
  const arr = loadReadArray().filter((x) => x !== k);
  if (read) arr.push(k);
  saveReadArray(arr);
}

export type ReadingStats = {
  readChapters: number;
  totalChapters: number;
  percent: number;
};

export function getReadingStats(): ReadingStats {
  const readChapters = loadReadArray().length;
  const totalChapters = TOTAL_BIBLE_CHAPTERS;
  const percent =
    totalChapters > 0 ? Math.round((readChapters / totalChapters) * 1000) / 10 : 0;
  return { readChapters, totalChapters, percent };
}

function loadNotesRaw(): VerseNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is VerseNote => {
      return (
        typeof x === "object" &&
        x !== null &&
        typeof (x as VerseNote).id === "string" &&
        typeof (x as VerseNote).body === "string"
      );
    });
  } catch {
    return [];
  }
}

function saveNotesRaw(notes: VerseNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, MAX_NOTES)));
  dispatchNotesChanged();
}

export function getAllNotes(): VerseNote[] {
  return loadNotesRaw().sort((a, b) => b.createdAt - a.createdAt);
}

export function getNotesForChapter(usfm: string, chapter: number): VerseNote[] {
  const u = usfm.toUpperCase();
  return loadNotesRaw()
    .filter((n) => n.usfm.toUpperCase() === u && n.chapter === chapter)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function addVerseNote(
  partial: Omit<VerseNote, "id" | "createdAt" | "updatedAt">,
): VerseNote {
  const now = Date.now();
  const note: VerseNote = {
    ...partial,
    usfm: partial.usfm.toUpperCase(),
    verses: [...new Set(partial.verses)].sort((a, b) => a - b),
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const notes = [note, ...loadNotesRaw()];
  saveNotesRaw(notes);
  return note;
}

export function updateVerseNote(id: string, body: string) {
  const notes = loadNotesRaw();
  const i = notes.findIndex((n) => n.id === id);
  if (i < 0) return;
  notes[i] = { ...notes[i], body: body.trim(), updatedAt: Date.now() };
  saveNotesRaw(notes);
}

export function deleteVerseNote(id: string) {
  saveNotesRaw(loadNotesRaw().filter((n) => n.id !== id));
}
