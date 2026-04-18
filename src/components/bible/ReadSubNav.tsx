import Link from "next/link";
import { BibleLanguageSwitcher } from "@/components/bible/BibleLanguageSwitcher";
import { cn } from "@/lib/utils/cn";
import type { BibleReadLang } from "@/lib/bible/read-language";

type ReadSubNavProps = {
  current?: "books" | "fortschritt";
  /** When set, shows the Bible text language control (server should pass cookie-derived value). */
  bibleLang?: BibleReadLang;
};

export function ReadSubNav({ current, bibleLang }: ReadSubNavProps) {
  return (
    <nav
      className="mb-6 flex flex-wrap items-center justify-between gap-4 text-sm"
      aria-label="Lesen"
    >
      <div className="flex flex-wrap gap-4">
        <Link
          href="/read"
          className={cn(
            "underline underline-offset-2",
            current === "books"
              ? "font-semibold text-zinc-900 dark:text-zinc-50"
              : "text-zinc-600 dark:text-zinc-400",
          )}
        >
          Bücher
        </Link>
        <Link
          href="/read/fortschritt"
          className={cn(
            "underline underline-offset-2",
            current === "fortschritt"
              ? "font-semibold text-zinc-900 dark:text-zinc-50"
              : "text-zinc-600 dark:text-zinc-400",
          )}
        >
          Fortschritt &amp; Statistik
        </Link>
      </div>
      {bibleLang !== undefined ? <BibleLanguageSwitcher value={bibleLang} /> : null}
    </nav>
  );
}
