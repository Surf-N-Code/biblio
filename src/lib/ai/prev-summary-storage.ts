import path from "node:path";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import redisDriver from "unstorage/drivers/redis";
import { getBiblioRedisUrl } from "@/lib/redis/biblio-redis-url";

/** Key prefix in Redis (avoids clashes if the DB is shared). */
const REDIS_KEY_BASE = "biblio:prev-chapter-summary";

const redisUrl = getBiblioRedisUrl();

const fsBaseDir =
  process.env.PREV_SUMMARY_STORAGE_DIR?.trim() ||
  path.join(process.cwd(), "data", "prev-summaries");

let storage: ReturnType<typeof createStorage> | undefined;

export function getPrevChapterSummaryStorage() {
  if (!storage) {
    storage = createStorage({
      driver: redisUrl
        ? redisDriver({
            url: redisUrl,
            base: REDIS_KEY_BASE,
          })
        : fsDriver({ base: fsBaseDir }),
    });
  }
  return storage;
}
