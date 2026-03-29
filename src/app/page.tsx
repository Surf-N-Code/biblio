import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-24">
      <main className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Biblio
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Bibel lesen, Verse markieren, Kurz-Erklärungen und Kontext per KI — optional mit Amplified
          und Matthew-Henry-Kommentar.
        </p>
        <Link
          href="/read"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Lesen starten
        </Link>
      </main>
    </div>
  );
}
