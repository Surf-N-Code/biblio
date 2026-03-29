import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type ReadSubNavProps = {
  current?: "books" | "fortschritt";
};

export function ReadSubNav({ current }: ReadSubNavProps) {
  return (
    <nav
      className="mb-6 flex flex-wrap gap-4 text-sm"
      aria-label="Lesen"
    >
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
    </nav>
  );
}
