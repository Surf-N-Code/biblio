import "server-only";

import OpenAI from "openai";
import { getOpenRouter, OPENROUTER_MODEL_QUICK } from "@/lib/ai/openrouter-client";

/** Prefer the directly configured OpenAI key; keep existing OpenRouter setups working. */
export function getSummaryProvider(): { client: OpenAI; model: string } | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (key) {
    return {
      client: new OpenAI({
        apiKey: key,
        baseURL: "https://api.openai.com/v1",
        timeout: 20_000,
        maxRetries: 1,
      }),
      model: process.env.OPENAI_MODEL_QUICK?.trim() || "gpt-4o",
    };
  }
  const client = getOpenRouter();
  return client ? { client, model: OPENROUTER_MODEL_QUICK } : null;
}
