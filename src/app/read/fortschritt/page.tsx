import { ReadFortschrittClient } from "@/app/read/fortschritt/ReadFortschrittClient";
import { getBibleReadLangFromCookies } from "@/lib/bible/read-language-server";

export default async function ReadFortschrittPage() {
  const bibleLang = await getBibleReadLangFromCookies();
  return <ReadFortschrittClient bibleLang={bibleLang} />;
}
