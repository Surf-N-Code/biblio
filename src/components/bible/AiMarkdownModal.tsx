"use client";

import { useEffect, useId, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils/cn";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-900 first:mt-0 dark:text-zinc-50">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-4 text-base font-semibold text-zinc-900 first:mt-0 dark:text-zinc-50">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-3 text-sm font-semibold text-zinc-900 first:mt-0 dark:text-zinc-50">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-relaxed text-zinc-800 last:mb-0 dark:text-zinc-200">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-zinc-800 dark:text-zinc-200">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-zinc-800 dark:text-zinc-200">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-sky-600 underline underline-offset-2 dark:text-sky-400"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-zinc-300 pl-3 text-sm italic text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-700" />,
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-900">{children}</pre>
  ),
  code: ({ className, children, ...props }) => {
    const inline = !className;
    if (inline) {
      return (
        <code
          className="rounded bg-zinc-200/90 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-900 dark:bg-zinc-800/90 dark:text-zinc-100"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono text-zinc-900 dark:text-zinc-100", className)} {...props}>
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse border border-zinc-200 text-left text-sm dark:border-zinc-700">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-100 dark:bg-zinc-900">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-zinc-200 px-2 py-1.5 font-semibold dark:border-zinc-700">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-zinc-200 px-2 py-1.5 dark:border-zinc-700">{children}</td>
  ),
};

export type AiMarkdownModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markdown: string | null;
};

export function AiMarkdownModal({ open, onOpenChange, markdown }: AiMarkdownModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && markdown?.trim()) {
      if (!d.open) d.showModal();
    } else if (d.open) {
      d.close();
    }
  }, [open, markdown]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed inset-0 z-100 m-0 flex w-full max-w-none items-center justify-center border-0 bg-transparent p-3 outline-none backdrop:bg-black/50",
      )}
      aria-labelledby={titleId}
      aria-modal="true"
      onClose={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "flex max-h-[min(100dvh-1.5rem,56rem)] w-full min-w-0 max-w-160 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl",
          "dark:border-zinc-700 dark:bg-zinc-950",
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 id={titleId} className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            KI-Antwort
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Schließen
          </button>
        </header>
        <div className="min-h-0 min-w-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
          {markdown?.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {markdown}
            </ReactMarkdown>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Kein Inhalt.</p>
          )}
        </div>
      </div>
    </dialog>
  );
}
