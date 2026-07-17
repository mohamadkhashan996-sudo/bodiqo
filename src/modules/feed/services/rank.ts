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
  interestTerms?: string[];
  body?: string | null;
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
  if (authorId && ctx.followingIds?.has(authorId)) {
    score += 6;
  }

  if (post.author?.isOfficial || post.isOfficial) score += 4;
  if (post.author?.isVerified) score += 2;

  if (ctx.interestTerms?.length && post.body) {
    const hay = post.body.toLowerCase();
    for (const term of ctx.interestTerms) {
      if (term && hay.includes(term)) {
        score += 3;
        break;
      }
    }
  }

  return score;
}

export function rankPosts<T extends RankablePost>(
  posts: T[],
  ctx: RankContext = {},
): T[] {
  return [...posts].sort((a, b) => {
    const diff = scorePost(b, ctx) - scorePost(a, ctx);
    if (Math.abs(diff) > 0.01) return diff;
    const aTime = new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.publishedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });
}
