import "server-only";

import { NextResponse } from "next/server";

export function openAIErrorMessage(error: unknown): string {
  if (
    typeof error === "object" && error !== null &&
    "code" in error && error.code === "credit_balance_exhausted"
  ) {
    return "OpenAI-Guthaben ist aufgebraucht. Bitte lade das API-Konto auf.";
  }
  return "OpenAI ist gerade nicht verfügbar. Bitte versuche es später erneut.";
}

export function openAIErrorResponse(error: unknown) {
  return NextResponse.json({ error: openAIErrorMessage(error) }, { status: 503 });
}
