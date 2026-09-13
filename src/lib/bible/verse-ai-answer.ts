export const VERSE_AI_KINDS = ["explain-brief", "explain-long", "context", "question"] as const;

export type VerseAiKind = (typeof VERSE_AI_KINDS)[number];

export type VerseAiAnswer = {
  id: string;
  usfm: string;
  chapter: number;
  verses: number[];
  reference: string;
  kind: VerseAiKind;
  text: string;
  createdAt: number;
};

export const VERSE_AI_LABELS: Record<VerseAiKind, string> = {
  "explain-brief": "Kurze Erklärung",
  "explain-long": "Ausführliche Erklärung",
  context: "Mehr Kontext",
  question: "Eigene Frage",
};
