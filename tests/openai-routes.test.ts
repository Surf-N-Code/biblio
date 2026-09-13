import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ options: vi.fn(), create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requireSession: async () => null }));
vi.mock("openai", () => ({
  default: class {
    constructor(options: unknown) { mocks.options(options); }
    chat = { completions: { create: mocks.create } };
  },
}));

import { POST as explain } from "@/app/api/bible/explain/route";
import { POST as context } from "@/app/api/bible/context/route";
import { POST as ask } from "@/app/api/bible/ask/route";
import { POST as translate } from "@/app/api/bible/translate/route";

function request(path: string, body: object) {
  return new Request(`http://localhost/api/bible/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  vi.stubEnv("DEEPL_API_KEY", "");
  vi.stubEnv("OPENAI_MODEL_QUICK", "");
  vi.stubEnv("OPENAI_MODEL_COMPLEX", "");
  mocks.create.mockResolvedValue({ choices: [{ message: { content: "Generated answer" } }] });
});

it("uses the OpenAI key for brief and extensive explanations", async () => {
  for (const detail of ["brief", "extensive"] as const) {
    const response = await explain(request("explain", { reference: "Genesis 1:1", passage: "In the beginning", detail }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "Generated answer" });
  }
  expect(mocks.options).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "test-openai-key", baseURL: "https://api.openai.com/v1" }));
  expect(mocks.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: "gpt-4o" }));
  expect(mocks.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: "gpt-4.1" }));
});

it("uses the OpenAI key for verse context", async () => {
  const response = await context(request("context", { reference: "Genesis 1:1", passage: "In the beginning" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ text: "Generated answer" });
  expect(mocks.options).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "test-openai-key", baseURL: "https://api.openai.com/v1" }));
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-4o" }));
});

it("answers a custom question with the selected verses in the prompt", async () => {
  const response = await ask(request("ask", {
    reference: "Genesis 1:1–2",
    passage: "1 In the beginning\n2 The earth was without form",
    question: "Was bedeutet 'ohne Gestalt'?",
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ text: "Generated answer" });
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
    model: "gpt-4.1",
    messages: expect.arrayContaining([
      expect.objectContaining({
        role: "user",
        content: expect.stringContaining("Was bedeutet 'ohne Gestalt'?"),
      }),
    ]),
  }));
  const userMessage = mocks.create.mock.calls[0][0].messages[1].content as string;
  expect(userMessage).toContain("Genesis 1:1–2");
  expect(userMessage).toContain("2 The earth was without form");
});

it("rejects an empty custom question without contacting OpenAI", async () => {
  const response = await ask(request("ask", {
    reference: "Genesis 1:1",
    passage: "In the beginning",
    question: "   ",
  }));
  expect(response.status).toBe(400);
  expect(mocks.create).not.toHaveBeenCalled();
});

it("uses OpenAI for German translation when DeepL is absent", async () => {
  const response = await translate(request("translate", { text: "In the beginning" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ text: "Generated answer", provider: "openai" });
  expect(mocks.options).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "test-openai-key", baseURL: "https://api.openai.com/v1" }));
});

it("allows model overrides without changing providers", async () => {
  vi.stubEnv("OPENAI_MODEL_QUICK", "my-quick-model");
  vi.stubEnv("OPENAI_MODEL_COMPLEX", "my-complex-model");
  await context(request("context", { reference: "Genesis 1:1", passage: "In the beginning" }));
  await explain(request("explain", { reference: "Genesis 1:1", passage: "In the beginning", detail: "extensive" }));
  expect(mocks.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: "my-quick-model" }));
  expect(mocks.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: "my-complex-model" }));
});

it("names the OpenAI key when AI tools have no configured provider", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");

  const responses = await Promise.all([
    explain(request("explain", { reference: "Genesis 1:1", passage: "In the beginning" })),
    context(request("context", { reference: "Genesis 1:1", passage: "In the beginning" })),
    ask(request("ask", { reference: "Genesis 1:1", passage: "In the beginning", question: "Was bedeutet das?" })),
    translate(request("translate", { text: "In the beginning" })),
  ]);

  for (const response of responses) {
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("OPENAI_API_KEY");
  }
  expect(mocks.create).not.toHaveBeenCalled();
});

it("reports exhausted OpenAI credits instead of returning an empty server error", async () => {
  mocks.create.mockRejectedValue({ status: 429, code: "credit_balance_exhausted" });
  const bodies = [
    [explain, request("explain", { reference: "Genesis 1:1", passage: "In the beginning" })],
    [context, request("context", { reference: "Genesis 1:1", passage: "In the beginning" })],
    [ask, request("ask", { reference: "Genesis 1:1", passage: "In the beginning", question: "Was bedeutet das?" })],
    [translate, request("translate", { text: "In the beginning" })],
  ] as const;

  for (const [handler, input] of bodies) {
    const response = await handler(input);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/OpenAI.*Guthaben/);
  }
});
