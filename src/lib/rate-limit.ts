type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** In-memory rate limit (Phase 1). Swap for Redis in production scale. */
export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
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
