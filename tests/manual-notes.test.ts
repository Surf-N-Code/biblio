import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { addVerseNote, getNotesForChapter, updateVerseNote, deleteVerseNote } from "@/lib/bible/reading-storage";

const note = { usfm: "mat", bookSlug: "matthew", bookName: "Matthew", chapter: 16, verses: [3, 1, 3], body: "First line\nSecond line", source: "user" as const };
let stored: Map<string, string>;
const dispatchEvent = vi.fn();
beforeEach(() => {
  stored = new Map();
  vi.stubGlobal("window", { dispatchEvent });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

it("round-trips a multi-verse note without mixing chapters, then edits and deletes it", () => {
  const saved = addVerseNote(note);
  expect(getNotesForChapter("MAT", 16)).toEqual([expect.objectContaining({ id: saved.id, verses: [1, 3], body: note.body })]);
  expect(getNotesForChapter("MAT", 17)).toEqual([]);
  updateVerseNote(saved.id, "  Edited\nStill multiline  ");
  expect(getNotesForChapter("MAT", 16)[0].body).toBe("Edited\nStill multiline");
  deleteVerseNote(saved.id);
  expect(getNotesForChapter("MAT", 16)).toEqual([]);
  expect(dispatchEvent).toHaveBeenCalledTimes(3);
});

it("reports a failed save without emitting a successful notes-change event", () => {
  vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
  expect(() => addVerseNote(note)).toThrow("Quota exceeded");
  expect(dispatchEvent).not.toHaveBeenCalled();
});

it("keeps the saved note intact when an edit cannot be persisted", () => {
  const saved = addVerseNote(note);
  vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
  expect(() => updateVerseNote(saved.id, "Unsaved edit")).toThrow();
  expect(getNotesForChapter("MAT", 16)[0].body).toBe(note.body);
});
