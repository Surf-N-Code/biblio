import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  isReadProgressRedisEnabled,
  redisGetReadProgressKeys,
  redisSetReadProgressKeys,
} from "@/lib/server/read-progress-redis";

export const runtime = "nodejs";

const READER_ID_HEADER = "x-biblio-reader-id";

const MAX_KEYS = 1500;
const MAX_KEY_LEN = 80;

function parseReaderId(request: Request): string | null {
  const raw = request.headers.get(READER_ID_HEADER)?.trim();
  if (!raw || raw.length < 8 || raw.length > 200) return null;
  if (!/^[a-zA-Z0-9-]+$/.test(raw)) return null;
  return raw;
}

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

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  if (!isReadProgressRedisEnabled()) {
    return NextResponse.json({ synced: false, keys: [] as string[] });
  }
  const readerId = parseReaderId(request);
  if (!readerId) {
    return NextResponse.json({ error: "Missing or invalid X-Biblio-Reader-Id" }, { status: 400 });
  }
  const keys = await redisGetReadProgressKeys(readerId);
  if (keys === null) {
    return NextResponse.json({ synced: false, keys: [] as string[] });
  }
  return NextResponse.json({ synced: true, keys });
}

export async function PUT(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  if (!isReadProgressRedisEnabled()) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 503 });
  }
  const readerId = parseReaderId(request);
  if (!readerId) {
    return NextResponse.json({ error: "Missing or invalid X-Biblio-Reader-Id" }, { status: 400 });
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
    await redisSetReadProgressKeys(readerId, keys);
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
