import { createClient, type RedisClientType } from "redis";

import { logger } from "@/lib/logger";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;

export async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (client?.isOpen) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      const next = createClient({ url });
      next.on("error", (error) =>
        logger.error("redis_error", {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      await next.connect();
      client = next as RedisClientType;
      return client;
    } catch (error) {
      logger.error("redis_connect_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

export async function redisPing(): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
