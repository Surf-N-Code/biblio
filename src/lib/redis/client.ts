import Redis from "ioredis";
import { getBiblioRedisUrl } from "@/lib/redis/biblio-redis-url";
import { parseRedisUrlToOptions } from "@/lib/redis/parse-redis-url";

let client: Redis | undefined;
let hasLoggedRedisError = false;

export function getRedis(): Redis | undefined {
  const url = getBiblioRedisUrl();
  if (!url) return undefined;
  if (!client) {
    client = new Redis({
      ...parseRedisUrlToOptions(url),
      // Avoid long hangs in API requests when Redis is unstable.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      retryStrategy: (attempt) => Math.min(attempt * 200, 2_000),
    });
    client.on("error", (err) => {
      // Prevent ioredis "Unhandled error event" noise while still exposing issues.
      if (!hasLoggedRedisError) {
        hasLoggedRedisError = true;
        console.error("[redis] connection error", err);
      }
    });
  }
  return client;
}
