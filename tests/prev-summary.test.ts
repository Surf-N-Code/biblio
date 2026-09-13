import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  create: vi.fn(), options: vi.fn(), hasItem: vi.fn(), getItem: vi.fn(), setItem: vi.fn(),
  chapter: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({default: class {
  constructor(options: unknown) { mocks.options(options); }
  chat = {completions: {create: mocks.create}};
}}));
vi.mock("@/lib/bible/api", () => ({ loadChapterPlainText: mocks.chapter }));
vi.mock("@/lib/ai/prev-summary-storage", () => ({getPrevChapterSummaryStorage: () => mocks}));
import { getPreviousChaptersContext } from "@/lib/ai/prev-summary";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  mocks.chapter.mockResolvedValue("Previous chapter text");
  mocks.create.mockResolvedValue({choices: [{message: {content: "A generated summary."}}]});
});
it("generates chapter context using the OpenAI key", async () => {
  await expect(getPreviousChaptersContext("GEN", "genesis", 2)).resolves.toBe("A generated summary.");
  expect(mocks.options).toHaveBeenCalledWith(expect.objectContaining({apiKey: "test-openai-key", baseURL: "https://api.openai.com/v1"}));
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({model: "gpt-4o"}));
});
it("requires the OpenAI key when generating an uncached chapter summary", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  await expect(getPreviousChaptersContext("GEN", "genesis", 2))
    .rejects.toThrow("Summary provider is not configured");
  expect(mocks.create).not.toHaveBeenCalled();
});
it("generates context even when Redis is rate-limited", async () => {
  mocks.hasItem.mockRejectedValue(new Error("rate-limited"));
  mocks.setItem.mockRejectedValue(new Error("rate-limited"));
  await expect(getPreviousChaptersContext("GEN", "genesis", 2)).resolves.toBe("A generated summary.");
});
it("returns cached text without calling the provider", async () => {
  mocks.hasItem.mockResolvedValue(true); mocks.getItem.mockResolvedValue("Cached summary.");
  await expect(getPreviousChaptersContext("GEN", "genesis", 2)).resolves.toBe("Cached summary.");
  expect(mocks.create).not.toHaveBeenCalled();
});
it("has no previous context for chapter one", async () => {
  await expect(getPreviousChaptersContext("GEN", "genesis", 1)).resolves.toBeNull();
  expect(mocks.create).not.toHaveBeenCalled();
});
