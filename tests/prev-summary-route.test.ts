import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const generate = vi.hoisted(() => vi.fn().mockRejectedValue(new Error("401 provider credential detail")));
vi.mock("@/lib/ai/prev-summary", () => ({getPreviousChaptersContext: generate}));
vi.mock("@/lib/bible/read-language-server", () => ({getBibleReadLangFromCookies: async () => "en"}));
import { GET } from "@/app/api/bible/prev-summary/route";
it("returns a safe retryable JSON error when the AI provider fails", async () => {
  const response = await GET(new Request("http://localhost/api/bible/prev-summary?usfm=GEN&slug=genesis&chapter=2"));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({error: expect.any(String)});
});

it("reports exhausted OpenAI credits for previous-chapter context", async () => {
  generate.mockRejectedValueOnce({ status: 429, code: "credit_balance_exhausted" });
  const response = await GET(new Request("http://localhost/api/bible/prev-summary?usfm=GEN&slug=genesis&chapter=2"));
  expect(response.status).toBe(503);
  expect((await response.json()).error).toMatch(/OpenAI.*Guthaben/);
});
