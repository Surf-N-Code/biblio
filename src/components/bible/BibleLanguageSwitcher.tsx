"use client";

import { useRouter } from "next/navigation";
import {
  BIBLE_READ_LANG_COOKIE,
  type BibleReadLang,
} from "@/lib/bible/read-language";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

type BibleLanguageSwitcherProps = {
  value: BibleReadLang;
};

export function BibleLanguageSwitcher({ value }: BibleLanguageSwitcherProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="biblio-bible-lang"
        className="text-zinc-600 dark:text-zinc-400"
      >
        Bibeltext
      </label>
      <select
        id="biblio-bible-lang"
        name="biblio-bible-lang"
        value={value}
        onChange={(e) => {
          const next = e.target.value as BibleReadLang;
          document.cookie = `${BIBLE_READ_LANG_COOKIE}=${next}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
          router.refresh();
        }}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
    </div>
  );
}
