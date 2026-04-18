import { getRedis } from "@/lib/redis/client";

/** `normalizeUsernameKey(session.username)` — distinct from legacy `biblio:read-progress:{uuid}`. */
const PREFIX = "biblio:read-progress:user:";

export function isReadProgressRedisEnabled(): boolean {
  return getRedis() !== undefined;
}

export async function redisGetReadProgressKeys(
  normalizedUsername: string,
): Promise<string[] | null> {
  const r = getRedis();
  if (!r) return null;
  let raw: string | null;
  try {
    raw = await r.get(PREFIX + normalizedUsername);
  } catch (error) {
    console.error("[read-progress] Redis read failed", error);
    return [];
  }
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
  normalizedUsername: string,
  keys: string[],
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const unique = [...new Set(keys)].sort();
  try {
    await r.set(PREFIX + normalizedUsername, JSON.stringify(unique));
  } catch (error) {
    console.error("[read-progress] Redis write failed", error);
  }
}
