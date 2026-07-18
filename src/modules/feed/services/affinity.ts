import { prisma } from "@/lib/prisma";
import { tokens } from "@/modules/ai/services/intelligence";
import type { RankContext } from "@/modules/feed/services/rank";

export type ViewerAffinity = RankContext & {
  /** Recent post IDs to soft-exclude from For You candidate pools. */
  seenPostIds: string[];
  /** True when the viewer has almost no personalization signals. */
  coldStart: boolean;
};

const postSnippet = {
  authorId: true,
  body: true,
  hashtags: {
    take: 6,
    include: { hashtag: { select: { tag: true } } },
  },
} as const;

/**
 * Build ranking affinity from declared interests + behavioral history
 * (likes, comments, shares, saves, watch/impressions).
 */
export async function buildViewerAffinity(
  userId: string,
): Promise<ViewerAffinity> {
  const [
    following,
    interests,
    likes,
    comments,
    shares,
    bookmarks,
    views,
  ] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.userInterest.findMany({
      where: { userId },
      include: { interest: { select: { name: true } } },
    }),
    prisma.postLike.findMany({
      where: { userId },
      take: 40,
      orderBy: { createdAt: "desc" },
      include: { post: { select: postSnippet } },
    }),
    prisma.comment.findMany({
      where: { authorId: userId, deletedAt: null },
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { post: { select: postSnippet } },
    }),
    prisma.postShare.findMany({
      where: { userId },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { post: { select: postSnippet } },
    }),
    prisma.bookmark.findMany({
      where: { userId },
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { post: { select: postSnippet } },
    }),
    prisma.postView.findMany({
      where: { viewerId: userId },
      take: 60,
      orderBy: { updatedAt: "desc" },
      include: { post: { select: postSnippet } },
    }),
  ]);

  const followingIds = new Set(following.map((row) => row.followingId));
  const authorAffinity = new Map<string, number>();
  const termWeights = new Map<string, number>();

  function bumpAuthor(authorId: string | undefined, weight: number) {
    if (!authorId || authorId === userId) return;
    authorAffinity.set(
      authorId,
      (authorAffinity.get(authorId) ?? 0) + weight,
    );
  }

  function bumpTerms(
    body: string | null | undefined,
    tags: Array<{ hashtag: { tag: string } }>,
    weight: number,
  ) {
    for (const word of tokens(body ?? "").slice(0, 8)) {
      termWeights.set(word, (termWeights.get(word) ?? 0) + weight);
    }
    for (const row of tags) {
      const tag = row.hashtag.tag.toLowerCase();
      termWeights.set(tag, (termWeights.get(tag) ?? 0) + weight * 1.5);
    }
  }

  for (const name of interests.map((i) => i.interest.name.toLowerCase())) {
    termWeights.set(name, (termWeights.get(name) ?? 0) + 4);
  }

  for (const row of likes) {
    bumpAuthor(row.post.authorId, 3);
    bumpTerms(row.post.body, row.post.hashtags, 2);
  }
  for (const row of comments) {
    bumpAuthor(row.post.authorId, 2.5);
    bumpTerms(row.post.body, row.post.hashtags, 1.5);
  }
  for (const row of shares) {
    if (!row.post) continue;
    bumpAuthor(row.post.authorId, 3.5);
    bumpTerms(row.post.body, row.post.hashtags, 2);
  }
  for (const row of bookmarks) {
    bumpAuthor(row.post.authorId, 4);
    bumpTerms(row.post.body, row.post.hashtags, 2.5);
  }
  for (const row of views) {
    const weight = row.completed ? 2 : 0.8;
    bumpAuthor(row.post.authorId, weight);
    bumpTerms(row.post.body, row.post.hashtags, weight * 0.5);
  }

  const interestTerms = [...termWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([term]) => term);

  const friendIds = new Set<string>();
  // Mutual follows = friends activity boost in ranking.
  if (followingIds.size) {
    const reverse = await prisma.follow.findMany({
      where: {
        followerId: { in: [...followingIds] },
        followingId: userId,
      },
      select: { followerId: true },
      take: 500,
    });
    for (const row of reverse) friendIds.add(row.followerId);
  }

  const coldStart =
    interests.length === 0 &&
    likes.length < 3 &&
    bookmarks.length === 0 &&
    followingIds.size < 3;

  return {
    followingIds,
    friendIds,
    interestTerms,
    authorAffinity,
    seenPostIds: views.map((row) => row.postId),
    coldStart,
    diversify: true,
    maxPerAuthor: coldStart ? 3 : 2,
  };
}
