import { cookies } from "next/headers";
import {
  BIBLE_READ_LANG_COOKIE,
  parseBibleReadLang,
  type BibleReadLang,
} from "@/lib/bible/read-language";

export async function getBibleReadLangFromCookies(): Promise<BibleReadLang> {
  const store = await cookies();
  return parseBibleReadLang(store.get(BIBLE_READ_LANG_COOKIE)?.value);
}
