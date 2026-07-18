/** Lightweight engagement + recency ranking for discovery feeds. */

export type RankablePost = {
  id: string;
  body?: string | null;
  likeCount?: number | null;
  commentCount?: number | null;
  shareCount?: number | null;
  bookmarkCount?: number | null;
  viewCount?: number | null;
  publishedAt?: Date | string | null;
  createdAt?: Date | string | null;
  authorId?: string;
  isOfficial?: boolean;
  author?: { isOfficial?: boolean; isVerified?: boolean } | null;
};

export type RankContext = {
  followingIds?: Set<string>;
  /** Mutual follows — stronger than one-way follow. */
  friendIds?: Set<string>;
  interestTerms?: string[];
  /** Per-author affinity from likes/comments/shares/saves/views. */
  authorAffinity?: Map<string, number>;
  body?: string | null;
  /** Cap how many posts per author appear early in the ranked list. */
  diversify?: boolean;
  maxPerAuthor?: number;
};

function hoursSince(date: Date | string | null | undefined) {
  if (!date) return 72;
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, ms / 3_600_000);
}

/** Higher is better. Recency-decayed engagement with light affinity boosts. */
export function scorePost(post: RankablePost, ctx: RankContext = {}) {
  const likes = post.likeCount ?? 0;
  const comments = post.commentCount ?? 0;
  const shares = post.shareCount ?? 0;
  const bookmarks = post.bookmarkCount ?? 0;
  const views = post.viewCount ?? 0;
  const ageHours = hoursSince(post.publishedAt ?? post.createdAt);

  const engagement =
    likes * 1.5 +
    comments * 2.2 +
    shares * 3 +
    bookmarks * 1.8 +
    Math.log10(views + 1) * 2;

  // Half-life ~18h so fresh posts stay competitive with viral older ones.
  const recency = Math.exp(-ageHours / 18);
  let score = engagement * recency + recency * 4;

  const authorId = post.authorId ?? undefined;
  if (authorId && ctx.friendIds?.has(authorId)) {
    score += 8;
  } else if (authorId && ctx.followingIds?.has(authorId)) {
    score += 5;
  }

  const affinity = authorId ? ctx.authorAffinity?.get(authorId) : undefined;
  if (affinity) {
    score += Math.min(12, affinity);
  }

  // Modest status boosts (fairness: avoid drowning newer creators).
  if (post.author?.isOfficial || post.isOfficial) score += 2;
  if (post.author?.isVerified) score += 1;

  if (ctx.interestTerms?.length && post.body) {
    const hay = post.body.toLowerCase();
    let matches = 0;
    for (const term of ctx.interestTerms) {
      if (term && hay.includes(term)) {
        matches += 1;
        if (matches >= 3) break;
      }
    }
    score += matches * 2.5;
  }

  return score;
}

/** Soft author diversity: keep top N per author first, append overflow. */
export function diversifyByAuthor<T extends RankablePost>(
  posts: T[],
  maxPerAuthor = 2,
): T[] {
  const counts = new Map<string, number>();
  const primary: T[] = [];
  const overflow: T[] = [];
  for (const post of posts) {
    const key = post.authorId ?? post.id;
    const count = counts.get(key) ?? 0;
    if (count < maxPerAuthor) {
      primary.push(post);
      counts.set(key, count + 1);
    } else {
      overflow.push(post);
    }
  }
  return [...primary, ...overflow];
}

export function rankPosts<T extends RankablePost>(
  posts: T[],
  ctx: RankContext = {},
): T[] {
  const ordered = [...posts].sort((a, b) => {
    const diff = scorePost(b, ctx) - scorePost(a, ctx);
    if (Math.abs(diff) > 0.01) return diff;
    const aTime = new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.publishedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });

  if (ctx.diversify === false) return ordered;
  return diversifyByAuthor(ordered, ctx.maxPerAuthor ?? 2);
}
