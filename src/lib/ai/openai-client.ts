import "server-only";

import OpenAI from "openai";

/** OpenAI configuration shared by every Bible AI tool. */
export function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.openai.com/v1",
    timeout: 20_000,
    maxRetries: 1,
  });
}

export function getOpenAIModelQuick(): string {
  return process.env.OPENAI_MODEL_QUICK?.trim() || "gpt-4o";
}

export function getOpenAIModelComplex(): string {
  return process.env.OPENAI_MODEL_COMPLEX?.trim() || "gpt-4.1";
}
