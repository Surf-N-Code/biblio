import "server-only";
import { getRedis } from "@/lib/redis/client";
import type { VerseAiAnswer } from "@/lib/bible/verse-ai-answer";

function key(username: string, usfm: string, chapter: number): string {
  return `biblio:verse-ai-answers:user:${username}:${usfm}:${chapter}`;
}

export async function getVerseAiAnswers(
  username: string,
  usfm: string,
  chapter: number,
): Promise<VerseAiAnswer[]> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");
  const rows = await redis.lrange(key(username, usfm, chapter), 0, -1);
  return rows.map((row) => JSON.parse(row) as VerseAiAnswer);
}

export async function addVerseAiAnswer(
  username: string,
  answer: VerseAiAnswer,
): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");
  await redis.lpush(key(username, answer.usfm, answer.chapter), JSON.stringify(answer));
}
