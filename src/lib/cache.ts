/**
 * Cache with optional Redis backing (REDIS_URL). Falls back to in-memory.
 */

import { getRedis } from "@/lib/redis";

type Entry = { value: unknown; expiresAt: number };

const memory = new Map<string, Entry>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(`cache:${key}`);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      /* fall through */
    }
  }

  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 60,
): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.setEx(`cache:${key}`, ttlSeconds, JSON.stringify(value));
      return;
    } catch {
      /* fall through */
    }
  }

  memory.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(`cache:${key}`);
    } catch {
      /* ignore */
    }
  }
  memory.delete(key);
}

export async function cacheDelPrefix(prefix: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      let cursor = "0";
      do {
        const result = await redis.scan(cursor, {
          MATCH: `cache:${prefix}*`,
          COUNT: 100,
        });
        cursor = String(result.cursor);
        if (result.keys.length) await redis.del(result.keys);
      } while (cursor !== "0");
    } catch {
      /* ignore */
    }
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const existing = await cacheGet<T>(key);
  if (existing !== null) return existing;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
