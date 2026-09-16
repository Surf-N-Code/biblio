"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** One scroll container, with controls outside it. No body translation or focus-scroll loop. */
export function VerseToolsDialog({ open, onClose, reference, onSaveNote, canSaveNote, status, children }: {
  open: boolean;
  onClose: () => void;
  reference: string;
  onSaveNote: () => void;
  canSaveNote: boolean;
  status: string | null;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const viewport = window.visualViewport;
    const update = () => {
      // Safari's keyboard changes the visual viewport, not the layout viewport.
      // Position the top-layer dialog directly; never scroll the page on focus.
      dialog.style.top = `${viewport?.offsetTop ?? 0}px`;
      dialog.style.height = `${viewport?.height ?? window.innerHeight}px`;
      dialog.style.left = `${viewport?.offsetLeft ?? 0}px`;
      dialog.style.width = `${viewport?.width ?? window.innerWidth}px`;
    };
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    update();
    dialog.showModal();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.overflow = previousOverflow;
      dialog.close();
    };
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => event.preventDefault()}
      data-no-chapter-swipe
      className="fixed inset-auto m-0 hidden max-h-none max-w-none overflow-hidden border-0 bg-transparent p-2 text-zinc-900 outline-none backdrop:bg-black/50 open:flex open:items-end open:justify-center dark:text-zinc-100 sm:p-4">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
        <header className="shrink-0 border-b border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold">Ausgewählte Verse</h2>
              <p className="truncate text-sm text-zinc-500">{reference}</p>
            </div>
            <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-full border border-zinc-300 px-3 text-sm dark:border-zinc-600">Schließen</button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={onSaveNote} disabled={!canSaveNote} className="min-h-11 shrink-0 rounded-full bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">Notiz speichern</button>
            {status && <p role="status" className="min-w-0 text-xs">{status}</p>}
          </div>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
