import { expect, it, vi } from "vitest";
vi.mock("@/lib/ai/prev-summary", () => ({getPreviousChaptersContext: vi.fn().mockRejectedValue(new Error("401 provider credential detail"))}));
vi.mock("@/lib/bible/read-language-server", () => ({getBibleReadLangFromCookies: async () => "en"}));
import { GET } from "@/app/api/bible/prev-summary/route";
it("returns a safe retryable JSON error when the AI provider fails", async () => {
  const response = await GET(new Request("http://localhost/api/bible/prev-summary?usfm=GEN&slug=genesis&chapter=2"));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({error: expect.any(String)});
});
