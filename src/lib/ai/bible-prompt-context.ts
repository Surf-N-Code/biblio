export type BibleAiPromptInput = {
  reference: string;
  /** Selected verse(s) the user focused on. */
  selectedPassage: string;
  /** Full current chapter text for broader context. */
  chapterText: string;
  bookName?: string;
};

const SYSTEM_BROAD_CONTEXT =
  "Du hast den vollständigen Kapiteltext zur Verfügung und darfst bei Bedarf auch weiteren Kontext aus dem Buch oder der gesamten Bibel einbeziehen. Der Fokus liegt auf der vom Nutzer ausgewählten Stelle.";

export function bibleAiSystemSuffix(): string {
  return SYSTEM_BROAD_CONTEXT;
}

export function buildBibleAiUserContent(
  input: BibleAiPromptInput,
  extraSections: string[] = [],
): string {
  const bookLabel = input.bookName?.trim();
  const parts = [
    `Ausgewählte Stelle (Fokus): ${input.reference}`,
    "",
    "Ausgewählte Verse:",
    input.selectedPassage,
    "",
    `Ganzes Kapitel${bookLabel ? ` (${bookLabel})` : ""}:`,
    input.chapterText,
    ...extraSections,
  ];
  return parts.join("\n");
}

export function parseBibleAiBody(body: Record<string, unknown>): {
  reference: string;
  selectedPassage: string;
  chapterText: string;
  bookName: string;
} | null {
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  const selectedPassage =
    typeof body.passage === "string"
      ? body.passage.trim()
      : typeof body.selectedPassage === "string"
        ? body.selectedPassage.trim()
        : "";
  const chapterText =
    typeof body.chapterText === "string" ? body.chapterText.trim() : "";
  const bookName = typeof body.bookName === "string" ? body.bookName.trim() : "";

  if (!reference || reference.length > 200) return null;
  if (!selectedPassage || selectedPassage.length > 50_000) return null;
  if (chapterText.length > 120_000) return null;
  if (bookName.length > 120) return null;

  return { reference, selectedPassage, chapterText, bookName };
}
