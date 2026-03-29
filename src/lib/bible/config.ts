export const SCRIPTURE_BASE = "https://api.scripture.api.bible/v1";

export function getPrimaryBibleId(): string | undefined {
  return process.env.SCRIPTURE_PRIMARY_BIBLE_ID?.trim() || undefined;
}

export function getAmplifiedBibleId(): string | undefined {
  return process.env.SCRIPTURE_AMPLIFIED_BIBLE_ID?.trim() || undefined;
}

export function hasScriptureApiKey(): boolean {
  return Boolean(process.env.SCRIPTURE_API_KEY?.trim());
}
