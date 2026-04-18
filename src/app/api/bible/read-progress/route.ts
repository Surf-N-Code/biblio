import { NextResponse } from "next/server";
import { normalizeUsernameKey } from "@/lib/auth/users";
import { getSession } from "@/lib/auth/session";
import {
  isReadProgressRedisEnabled,
  redisGetReadProgressKeys,
  redisSetReadProgressKeys,
} from "@/lib/server/read-progress-redis";

export const runtime = "nodejs";

const MAX_KEYS = 1500;
const MAX_KEY_LEN = 80;

function normalizeKeys(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") return null;
    if (x.length > MAX_KEY_LEN) return null;
    out.push(x);
  }
  if (out.length > MAX_KEYS) return null;
  return [...new Set(out)].sort();
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const username = normalizeUsernameKey(session.username);

  if (!isReadProgressRedisEnabled()) {
    return NextResponse.json({ synced: false, keys: [] as string[] });
  }
  const keys = await redisGetReadProgressKeys(username);
  if (keys === null) {
    return NextResponse.json({ synced: false, keys: [] as string[] });
  }
  return NextResponse.json({ synced: true, keys, username });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const username = normalizeUsernameKey(session.username);

  if (!isReadProgressRedisEnabled()) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("keys" in body)) {
    return NextResponse.json({ error: "Expected { keys: string[] }" }, { status: 400 });
  }
  const keys = normalizeKeys((body as { keys: unknown }).keys);
  if (keys === null) {
    return NextResponse.json({ error: "Invalid keys array" }, { status: 400 });
  }
  try {
    await redisSetReadProgressKeys(username, keys);
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
