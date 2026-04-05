import { getRedis } from "@/lib/redis/client";

const PREFIX = "biblio:read-progress:";

export function isReadProgressRedisEnabled(): boolean {
  return getRedis() !== undefined;
}

export async function redisGetReadProgressKeys(
  readerId: string,
): Promise<string[] | null> {
  const r = getRedis();
  if (!r) return null;
  const raw = await r.get(PREFIX + readerId);
  if (raw == null || raw === "") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export async function redisSetReadProgressKeys(
  readerId: string,
  keys: string[],
): Promise<void> {
  const r = getRedis();
  if (!r) throw new Error("Redis not configured");
  const unique = [...new Set(keys)].sort();
  await r.set(PREFIX + readerId, JSON.stringify(unique));
}
