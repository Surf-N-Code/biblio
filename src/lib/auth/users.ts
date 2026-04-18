import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createStorage } from "unstorage";
import redisDriver from "unstorage/drivers/redis";
import { getBiblioRedisUrl } from "@/lib/redis/biblio-redis-url";

const scryptAsync = promisify(scrypt);

const USERS_BASE = "biblio:users";

export type StoredUser = {
  username: string;
  passwordHash: string;
  createdAt: number;
};

let storage: ReturnType<typeof createStorage> | undefined;

function getUserStorage() {
  const url = getBiblioRedisUrl();
  if (!url) return null;
  if (!storage) {
    storage = createStorage({
      driver: redisDriver({
        url,
        base: USERS_BASE,
      }),
    });
  }
  return storage;
}

export function isAuthStorageAvailable(): boolean {
  return Boolean(getBiblioRedisUrl());
}

/** Same normalization as Redis user keys and unstorage user item keys. */
export function normalizeUsernameKey(username: string): string {
  return username.trim().toLowerCase();
}

/** scrypt with random salt; format scrypt:base64(salt):base64(hash) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64")}:${derived.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "base64");
    const expected = Buffer.from(parts[2], "base64");
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function parseStoredUser(raw: unknown): StoredUser | null {
  const parsed =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return null;
          }
        })()
      : raw;

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as StoredUser).username !== "string" ||
    typeof (parsed as StoredUser).passwordHash !== "string" ||
    typeof (parsed as StoredUser).createdAt !== "number"
  ) {
    return null;
  }

  return parsed as StoredUser;
}

export async function getUser(username: string): Promise<StoredUser | null> {
  const st = getUserStorage();
  if (!st) return null;
  const key = normalizeUsernameKey(username);
  const raw = await st.getItem(key);
  return parseStoredUser(raw);
}

export type CreateUserResult =
  | { ok: true }
  | { ok: false; error: "taken" | "unavailable" | "invalid" };

export async function createUser(
  username: string,
  password: string,
): Promise<CreateUserResult> {
  const st = getUserStorage();
  if (!st) return { ok: false, error: "unavailable" };

  const key = normalizeUsernameKey(username);
  if (!key) return { ok: false, error: "invalid" };

  const existing = await st.getItem(key);
  if (existing != null) return { ok: false, error: "taken" };

  const passwordHash = await hashPassword(password);
  const record: StoredUser = {
    username: username.trim(),
    passwordHash,
    createdAt: Date.now(),
  };
  await st.setItem(key, record);
  return { ok: true };
}
