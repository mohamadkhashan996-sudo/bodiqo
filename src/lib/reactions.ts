import type { ReactionType } from "@prisma/client";

export const REACTION_TYPES = [
  "LIKE",
  "LOVE",
  "LAUGH",
  "WOW",
  "SAD",
  "ANGRY",
] as const satisfies readonly ReactionType[];

export type ReactionKey = (typeof REACTION_TYPES)[number];

export const REACTION_META: Record<
  ReactionKey,
  { emoji: string; label: string; color: string }
> = {
  LIKE: { emoji: "👍", label: "Like", color: "var(--signal-deep)" },
  LOVE: { emoji: "❤️", label: "Love", color: "var(--ember)" },
  LAUGH: { emoji: "😂", label: "Laugh", color: "#eab308" },
  WOW: { emoji: "😮", label: "Wow", color: "#f59e0b" },
  SAD: { emoji: "😢", label: "Sad", color: "#60a5fa" },
  ANGRY: { emoji: "😡", label: "Angry", color: "#ef4444" },
};

export type ReactionCounts = Record<ReactionKey, number>;

export function emptyReactionCounts(): ReactionCounts {
  return {
    LIKE: 0,
    LOVE: 0,
    LAUGH: 0,
    WOW: 0,
    SAD: 0,
    ANGRY: 0,
  };
}

export function normalizeReactionCounts(raw: unknown): ReactionCounts {
  const base = emptyReactionCounts();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const key of REACTION_TYPES) {
    const n = Number(obj[key] ?? 0);
    base[key] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return base;
}

export function bumpReactionCount(
  counts: ReactionCounts,
  type: ReactionKey,
  delta: number,
): ReactionCounts {
  const next = { ...counts };
  next[type] = Math.max(0, (next[type] ?? 0) + delta);
  return next;
}

export function isReactionType(value: string): value is ReactionKey {
  return (REACTION_TYPES as readonly string[]).includes(value);
}

export function totalReactions(counts: ReactionCounts) {
  return REACTION_TYPES.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
}

/** Top reaction types present (for summary chips). */
export function topReactionTypes(counts: ReactionCounts, limit = 3) {
  return REACTION_TYPES.map((type) => ({ type, count: counts[type] }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
