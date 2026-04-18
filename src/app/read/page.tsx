import type { Metadata } from "next";
import { ReadingStatsInline } from "@/components/bible/ReadingStatsInline";
import { ReadSubNav } from "@/components/bible/ReadSubNav";
import { SortableBookList } from "@/components/bible/SortableBookList";
import { getBibleReadLangFromCookies } from "@/lib/bible/read-language-server";

export const metadata: Metadata = {
  title: "Lesen",
  description: "Wähle ein biblisches Buch und starte mit Kapitel 1.",
};

export default async function ReadIndexPage() {
  const bibleLang = await getBibleReadLangFromCookies();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ReadSubNav current="books" bibleLang={bibleLang} />
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Buch wählen
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Wähle ein Buch, dann ein Kapitel — oder blättere dort mit den Pfeilen weiter.
      </p>
      <ReadingStatsInline />
      <SortableBookList />
    </div>
  );
}
