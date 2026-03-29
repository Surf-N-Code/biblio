import type { Metadata } from "next";
import { SortableBookList } from "@/components/bible/SortableBookList";

export const metadata: Metadata = {
  title: "Lesen",
  description: "Wähle ein biblisches Buch und starte mit Kapitel 1.",
};

export default function ReadIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Buch wählen
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Wähle ein Buch, dann ein Kapitel — oder blättere dort mit den Pfeilen weiter.
      </p>
      <SortableBookList />
    </div>
  );
}
