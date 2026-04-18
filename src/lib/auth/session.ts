import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createStorage } from "unstorage";
import redisDriver from "unstorage/drivers/redis";
import { getBiblioRedisUrl } from "@/lib/redis/biblio-redis-url";

export const SESSION_COOKIE = "biblio-session";

const SESSIONS_BASE = "biblio:sessions";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionPayload = {
  username: string;
  createdAt: number;
};

let storage: ReturnType<typeof createStorage> | undefined;

function getSessionStorage() {
  const url = getBiblioRedisUrl();
  if (!url) return null;
  if (!storage) {
    storage = createStorage({
      driver: redisDriver({
        url,
        base: SESSIONS_BASE,
      }),
    });
  }
  return storage;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function parseSessionPayload(raw: unknown): SessionPayload | null {
  const parsed =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return null;
          }
        })()
      : raw;

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as SessionPayload).username !== "string" ||
    typeof (parsed as SessionPayload).createdAt !== "number"
  ) {
    return null;
  }

  return parsed as SessionPayload;
}

export async function createSession(username: string): Promise<void> {
  const st = getSessionStorage();
  if (!st) throw new Error("Redis not configured for sessions");

  const token = newSessionToken();
  const payload: SessionPayload = {
    username,
    createdAt: Date.now(),
  };
  await st.setItem(token, payload, {
    ttl: SESSION_TTL_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

async function loadSessionByToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token || token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
    return null;
  }
  const st = getSessionStorage();
  if (!st) return null;
  const raw = await st.getItem(token);
  return parseSessionPayload(raw);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return loadSessionByToken(token);
}

/** Use in proxy: validate cookie + Redis without `cookies()` from next/headers. */
export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return loadSessionByToken(token);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const st = getSessionStorage();
    if (st) await st.removeItem(token);
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * For Route Handlers: returns a 401 JSON response if unauthenticated, else null.
 */
export async function requireSession(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function isSessionStorageAvailable(): boolean {
  return Boolean(getBiblioRedisUrl());
}
