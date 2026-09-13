import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({get: vi.fn(), set: vi.fn()}));
vi.mock("@/lib/redis/client", () => ({getRedis: () => mocks}));
vi.mock("@/lib/auth/session", () => ({getSession: async () => ({username: "NDilthey"})}));
import { GET, PUT } from "@/app/api/bible/read-progress/route";
beforeEach(() => vi.resetAllMocks());
it("does not report a failed Redis read as successfully synced empty progress", async () => {
  mocks.get.mockRejectedValue(new Error("Stream isn't writeable and enableOfflineQueue options is false"));
  const result = await GET();
  expect(result.status).toBe(503);
  expect(await result.json()).not.toHaveProperty("synced", true);
});
it("reports failed writes instead of acknowledging unsaved progress", async () => {
  mocks.set.mockRejectedValue(new Error("rate-limited"));
  const result = await PUT(new Request("http://localhost/api/bible/read-progress", {method:"PUT",body:JSON.stringify({keys:["GEN:1"]})}));
  expect(result.status).toBeGreaterThanOrEqual(500);
});
it("reads the normalized account's stored chapters", async () => {
  mocks.get.mockResolvedValue('["GEN:1"]');
  const result=await GET();
  expect(await result.json()).toEqual({synced:true,keys:["GEN:1"],username:"ndilthey"});
  expect(mocks.get).toHaveBeenCalledWith("biblio:read-progress:user:ndilthey");
});
