import { getRedis } from "@/lib/redis";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Distributed rate limit when Redis is configured; in-memory fallback otherwise. */
export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): Promise<{ ok: boolean; remaining: number }> {
  const redis = await getRedis();
  if (redis) {
    try {
      const bucketKey = `rl:${key}`;
      const count = await redis.incr(bucketKey);
      if (count === 1) {
        await redis.pExpire(bucketKey, windowMs);
      }
      if (count > limit) {
        return { ok: false, remaining: 0 };
      }
      return { ok: true, remaining: Math.max(0, limit - count) };
    } catch {
      /* fall through */
    }
  }

  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  current.count += 1;
  return { ok: true, remaining: limit - current.count };
}
