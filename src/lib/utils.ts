import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Keep first occurrence of each `id` — safe for React list keys. */
export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  if (items.length < 2) return items;
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Append `incoming` after `existing`, skipping ids already present. */
export function appendUniqueById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  if (!incoming.length) return existing;
  if (!existing.length) return uniqueById(incoming);
  const seen = new Set(existing.map((item) => item.id));
  const next = [...existing];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

/** Compact counts for profile / shorts (1.2K, 3.4M). */
export function formatCount(n: number) {
  const value = Math.max(0, Math.floor(n));
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const k = value / 1000;
    return `${k >= 10 ? Math.floor(k) : Math.round(k * 10) / 10}K`;
  }
  const m = value / 1_000_000;
  return `${m >= 10 ? Math.floor(m) : Math.round(m * 10) / 10}M`;
}
