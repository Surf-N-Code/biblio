import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(),
  cookieGet: vi.fn(), cookieSet: vi.fn(), cookieDelete: vi.fn(),
}));
vi.mock("unstorage", () => ({ createStorage: () => mocks }));
vi.mock("unstorage/drivers/redis", () => ({ default: () => ({}) }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: mocks.cookieGet, set: mocks.cookieSet, delete: mocks.cookieDelete,
}) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/users";
import { login, signup, logout } from "@/app/actions/auth";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BIBLIO_REDIS_URL", "redis://localhost:6379");
});
function form() {
  const data = new FormData();
  data.set("username", "Alice"); data.set("password", "test-password");
  return data;
}
describe("Redis outage during authentication", () => {
  it("renders logged-out state when an existing session cannot be read", async () => {
    mocks.cookieGet.mockReturnValue({ value: "a".repeat(64) });
    mocks.getItem.mockRejectedValue(new Error("ERR Your database has been temporarily rate-limited"));
    await expect(getSession()).resolves.toBeNull();
  });
  it("returns a form error when the user lookup fails", async () => {
    mocks.getItem.mockRejectedValue(new Error("rate-limited"));
    await expect(login(undefined, form())).resolves.toHaveProperty("error");
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
  it("does not report success when session persistence fails", async () => {
    mocks.getItem.mockResolvedValue({username: "Alice", passwordHash: await hashPassword("test-password"), createdAt: 1});
    mocks.setItem.mockRejectedValue(new Error("rate-limited"));
    await expect(login(undefined, form())).resolves.toHaveProperty("error");
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
  it("returns a registration error on storage failure", async () => {
    mocks.getItem.mockRejectedValue(new Error("rate-limited"));
    await expect(signup(undefined, form())).resolves.toHaveProperty("error");
  });
  it("clears the browser cookie even when session deletion fails", async () => {
    mocks.cookieGet.mockReturnValue({ value: "a".repeat(64) });
    mocks.removeItem.mockRejectedValue(new Error("rate-limited"));
    await expect(logout()).rejects.toThrow("REDIRECT:/login");
    expect(mocks.cookieDelete).toHaveBeenCalledWith("biblio-session");
  });
});
it("still signs in with valid credentials and persists the session before redirecting", async () => {
  mocks.getItem.mockResolvedValue({username: "Alice", passwordHash: await hashPassword("test-password"), createdAt: 1});
  await expect(login(undefined, form())).rejects.toThrow("REDIRECT:/read");
  expect(mocks.cookieSet).toHaveBeenCalledWith("biblio-session", expect.stringMatching(/^[a-f0-9]{64}$/), expect.objectContaining({httpOnly: true}));
});
it("rejects incorrect credentials without creating a session", async () => {
  mocks.getItem.mockResolvedValue({username: "Alice", passwordHash: await hashPassword("different-password"), createdAt: 1});
  await expect(login(undefined, form())).resolves.toHaveProperty("error");
  expect(mocks.setItem).not.toHaveBeenCalled();
});
