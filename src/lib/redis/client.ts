import Redis from "ioredis";
import { getBiblioRedisUrl } from "@/lib/redis/biblio-redis-url";
import { parseRedisUrlToOptions } from "@/lib/redis/parse-redis-url";

let client: Redis | undefined;

export function getRedis(): Redis | undefined {
  const url = getBiblioRedisUrl();
  if (!url) return undefined;
  if (!client) {
    client = new Redis(parseRedisUrlToOptions(url));
  }
  return client;
}
