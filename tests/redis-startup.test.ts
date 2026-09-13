import { createServer, type Socket } from "node:net";
import { once } from "node:events";
import { expect, it, vi } from "vitest";

it("waits for the initial Redis connection before reading saved progress", async () => {
  // Minimal RESP fixture: real ioredis connection and ready handshake, no external database.
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      while (buffer) {
        const headerEnd = buffer.indexOf("\r\n");
        if (headerEnd < 0) return;
        const count = Number(buffer.slice(1, headerEnd));
        let offset = headerEnd + 2;
        const args: string[] = [];
        for (let i = 0; i < count; i++) {
          const end = buffer.indexOf("\r\n", offset);
          if (end < 0) return;
          const length = Number(buffer.slice(offset + 1, end));
          if (buffer.length < end + 2 + length + 2) return;
          args.push(buffer.slice(end + 2, end + 2 + length));
          offset = end + 2 + length + 2;
        }
        buffer = buffer.slice(offset);
        const value = args[0].toLowerCase() === "info"
          ? "redis_version:7.0.0\r\nloading:0\r\n"
          : args[0].toLowerCase() === "get" ? '["GEN:1"]' : null;
        socket.write(value === null ? "+OK\r\n" : `$${Buffer.byteLength(value)}\r\n${value}\r\n`);
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test port");
  vi.stubEnv("BIBLIO_REDIS_URL", `redis://127.0.0.1:${address.port}`);
  vi.resetModules();
  const { getRedis } = await import("@/lib/redis/client");
  try {
    const { redisGetReadProgressKeys } = await import("@/lib/server/read-progress-redis");
    await expect(redisGetReadProgressKeys("ndilthey")).resolves.toEqual(["GEN:1"]);
  } finally {
    getRedis()?.disconnect();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllEnvs();
  }
});
