import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  username: "ndilthey" as string | null,
  rows: new Map<string, string[]>(),
  fail: false,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  getSession: async () => state.username ? { username: state.username, createdAt: 1 } : null,
}));
vi.mock("@/lib/redis/client", () => ({
  getRedis: () => ({
    lpush: async (key: string, value: string) => {
      if (state.fail) throw new Error("Redis unavailable");
      state.rows.set(key, [value, ...(state.rows.get(key) ?? [])]);
    },
    lrange: async (key: string) => {
      if (state.fail) throw new Error("Redis unavailable");
      return state.rows.get(key) ?? [];
    },
  }),
}));

import { GET, POST } from "@/app/api/bible/ai-answers/route";

const selection = {
  usfm: "MAT",
  chapter: 16,
  verses: [2, 1, 2],
  reference: "Matthäus 16:1–2",
  kind: "question",
  text: "## Frage\nWarum?\n\n## Antwort\nErklärung",
};

function post(body: object) {
  return POST(new Request("http://localhost/api/bible/ai-answers", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
}

function get(chapter = 16) {
  return GET(new Request(`http://localhost/api/bible/ai-answers?usfm=MAT&chapter=${chapter}`));
}

beforeEach(() => {
  state.username = "ndilthey";
  state.rows.clear();
  state.fail = false;
});

it("stores multiple answers for the same selection and reads them across requests", async () => {
  const first = await post(selection);
  expect(first.status).toBe(201);
  const firstAnswer = (await first.json()).answer;
  expect(firstAnswer).toMatchObject({ usfm: "MAT", chapter: 16, verses: [1, 2], kind: "question", text: selection.text });

  const second = await post({ ...selection, kind: "context", text: "More context" });
  expect(second.status).toBe(201);
  const list = await get();
  expect(list.headers.get("Cache-Control")).toBe("no-store");
  const { answers } = await list.json();
  expect(answers).toHaveLength(2);
  expect(answers[0].text).toBe("More context");
  expect(answers[1].id).toBe(firstAnswer.id);
  expect((await (await get(17)).json()).answers).toEqual([]);
});

it("isolates answers by signed-in user", async () => {
  await post(selection);
  state.username = "another-user";
  expect((await (await get()).json()).answers).toEqual([]);
  await post({ ...selection, text: "Another user's answer" });
  state.username = "ndilthey";
  expect((await (await get()).json()).answers.map((answer: { text: string }) => answer.text)).toEqual([selection.text]);
});

it("requires login and rejects malformed verse associations", async () => {
  state.username = null;
  expect((await post(selection)).status).toBe(401);
  expect((await get()).status).toBe(401);
  state.username = "ndilthey";
  expect((await post({ ...selection, verses: [] })).status).toBe(400);
  expect((await post({ ...selection, verses: [0] })).status).toBe(400);
  expect((await post({ ...selection, kind: "unknown" })).status).toBe(400);
  expect(state.rows.size).toBe(0);
});

it("reports Redis failures instead of claiming an answer was saved", async () => {
  state.fail = true;
  expect((await post(selection)).status).toBe(503);
  expect((await get()).status).toBe(503);
});
