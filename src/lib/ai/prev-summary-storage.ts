import path from "node:path";
import { createStorage, joinKeys } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { getRedis } from "@/lib/redis/client";

/** Key prefix in Redis (avoids clashes if the DB is shared). */
const REDIS_KEY_BASE = "biblio:prev-chapter-summary";

const fsBaseDir =
  process.env.PREV_SUMMARY_STORAGE_DIR?.trim() ||
  path.join(process.cwd(), "data", "prev-summaries");

/** Matches unstorage redis driver keying: joinKeys(base, itemKey). */
function redisItemKey(itemKey: string): string {
  const base = REDIS_KEY_BASE.replace(/:$/, "");
  return joinKeys(base, itemKey);
}

function createRedisPrevSummaryStorage(redis: NonNullable<ReturnType<typeof getRedis>>) {
  return {
    async hasItem(key: string) {
      return Boolean(await redis.exists(redisItemKey(key)));
    },
    async getItem(key: string) {
      return (await redis.get(redisItemKey(key))) ?? null;
    },
    async setItem(key: string, value: string) {
      await redis.set(redisItemKey(key), value);
    },
  };
}

let storage:
  | ReturnType<typeof createRedisPrevSummaryStorage>
  | ReturnType<typeof createStorage>
  | undefined;

export function getPrevChapterSummaryStorage() {
  if (!storage) {
    const redis = getRedis();
    if (redis) {
      storage = createRedisPrevSummaryStorage(redis);
    } else {
      storage = createStorage({
        driver: fsDriver({ base: fsBaseDir }),
      });
    }
  }
  return storage;
}
