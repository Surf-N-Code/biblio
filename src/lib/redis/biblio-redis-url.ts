/**
 * Single Redis URL for Biblio features (AI summary cache, read progress, …).
 * `BIBLIO_REDIS_URL` wins; otherwise `PREV_SUMMARY_REDIS_URL` is used for backward compatibility.
 */
export function getBiblioRedisUrl(): string | undefined {
  const raw =
    process.env.BIBLIO_REDIS_URL?.trim() ||
    process.env.PREV_SUMMARY_REDIS_URL?.trim();
  if (!raw) return undefined;
  return redisUrlWithTls(raw);
}

/**
 * Upstash requires TLS. `redis-cli --tls` with `redis://` maps to `rediss://` for ioredis.
 */
export function redisUrlWithTls(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith("redis://") &&
    !trimmed.startsWith("rediss://") &&
    /[@.]upstash\.io[:/]/i.test(trimmed)
  ) {
    return `rediss://${trimmed.slice("redis://".length)}`;
  }
  return trimmed;
}
