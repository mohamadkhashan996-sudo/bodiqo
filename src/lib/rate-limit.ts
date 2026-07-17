import { getRedis } from "@/lib/redis";
import { AppError } from "@/lib/errors";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Atomic INCR + PEXPIRE so keys never stick without TTL. */
const INCR_EXPIRE_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return current
`;

/**
 * Distributed rate limit when Redis is configured.
 * Production fails closed without Redis; development uses in-memory fallback.
 */
export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): Promise<{ ok: boolean; remaining: number }> {
  const redis = await getRedis();
  if (redis) {
    try {
      const bucketKey = `rl:${key}`;
      const count = Number(
        await redis.eval(INCR_EXPIRE_LUA, {
          keys: [bucketKey],
          arguments: [String(windowMs)],
        }),
      );
      if (count > limit) {
        return { ok: false, remaining: 0 };
      }
      return { ok: true, remaining: Math.max(0, limit - count) };
    } catch {
      if (process.env.NODE_ENV === "production") {
        throw new AppError("Rate limiter unavailable", 503, "RATE_LIMITER_DOWN");
      }
    }
  } else if (process.env.NODE_ENV === "production") {
    throw new AppError("Rate limiter unavailable", 503, "RATE_LIMITER_DOWN");
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
