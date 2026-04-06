import type { RedisOptions } from "ioredis";

/**
 * Maps a Redis connection URL to ioredis options using the WHATWG URL API.
 * Avoids passing a string into `new Redis(url)`, which triggers Node's
 * deprecated `url.parse()` inside ioredis (DEP0169).
 */
export function parseRedisUrlToOptions(urlString: string): RedisOptions {
  const trimmed = urlString.trim();
  if (/^\d+$/.test(trimmed)) {
    return { port: Number.parseInt(trimmed, 10) };
  }

  let input = trimmed;
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
  if (!hasScheme && trimmed[0] !== "/") {
    input = `//${trimmed}`;
  }

  const defaultBase = trimmed.startsWith("rediss:")
    ? "rediss://localhost/"
    : "redis://localhost/";

  let u: URL;
  try {
    u = new URL(input, defaultBase);
  } catch {
    throw new Error("Invalid Redis URL");
  }

  if (u.protocol !== "redis:" && u.protocol !== "rediss:") {
    throw new Error(`Unsupported Redis URL protocol: ${u.protocol}`);
  }

  const options: RedisOptions = {};
  const isTls = u.protocol === "rediss:";

  if (u.username !== "") {
    options.username = decodeURIComponent(u.username);
  }
  if (u.password !== "") {
    options.password = decodeURIComponent(u.password);
  }
  if (u.hostname !== "") {
    options.host = u.hostname;
  }
  if (u.port !== "") {
    options.port = Number.parseInt(u.port, 10);
  }

  if (u.pathname.length > 1) {
    const db = u.pathname.slice(1);
    if (db !== "") {
      const n = Number.parseInt(db, 10);
      if (!Number.isNaN(n)) {
        options.db = n;
      }
    }
  }

  u.searchParams.forEach((value, key) => {
    if (key === "family") {
      const n = Number.parseInt(value, 10);
      if (!Number.isNaN(n)) {
        options.family = n;
      }
      return;
    }
    (options as Record<string, string>)[key] = value;
  });

  if (isTls) {
    options.tls = {};
  }

  return options;
}
