import "server-only";

import OpenAI from "openai";

/** Medium tier: quick explanations, context, translation fallback, summaries */
export const OPENROUTER_MODEL_QUICK =
  process.env.OPENROUTER_MODEL_QUICK?.trim() || "openai/gpt-4o";

/** Large tier: extensive / complex explanations */
export const OPENROUTER_MODEL_COMPLEX =
  process.env.OPENROUTER_MODEL_COMPLEX?.trim() || "anthropic/claude-opus-4.6";

/**
 * OpenRouter client (OpenAI-compatible API). Uses only `OPENROUTER_API_KEY` from
 * the server environment — never use a `NEXT_PUBLIC_*` name for the key.
 */
export function getOpenRouter(): OpenAI | null {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      ...(siteUrl ? { "HTTP-Referer": siteUrl } : {}),
      "X-Title": "biblio",
    },
  });
}
