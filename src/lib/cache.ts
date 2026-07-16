/**
 * Lightweight cache with optional Redis URL awareness.
 * Falls back to in-memory Map when REDIS_URL is unset.
 */

type Entry = { value: unknown; expiresAt: number };

const memory = new Map<string, Entry>();

export async function cacheGet<T>(key: string): Promise<T | null> {
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
  memory.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(key: string): Promise<void> {
  memory.delete(key);
}

export async function cacheDelPrefix(prefix: string): Promise<void> {
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

/** Wrap a loader with short TTL caching */
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
