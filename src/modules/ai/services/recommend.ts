import { cached, cacheDel } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { uniqueById } from "@/lib/utils";
import { rankPosts } from "@/modules/feed/services/rank";
import { blockedIdsFor } from "@/modules/users/services/visibility";

export async function getSmartRecommendations(
  userId: string,
  opts?: { fresh?: boolean },
) {
  const key = `reco:${userId}`;
  if (opts?.fresh) await cacheDel(key);

  return cached(key, 90, async () => {
    const blocked = await blockedIdsFor(userId);
    const { buildViewerAffinity } = await import(
      "@/modules/feed/services/affinity"
    );
    const affinity = await buildViewerAffinity(userId);

    const followingIds = [...(affinity.followingIds ?? [])];
    const interestTerms = affinity.interestTerms ?? [];
    const exclude = [
      ...new Set([userId, ...followingIds, ...blocked]),
    ];
    const authorExclude = exclude;
    const followingSet = affinity.followingIds ?? new Set(followingIds);
    const windowStart = new Date(Date.now() - 21 * 24 * 60 * 60_000);

    const creators = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        isPrivate: false,
        id: { notIn: authorExclude },
      },
      take: 12,
      orderBy: [{ isVerified: "desc" }, { followersCount: "desc" }],
      select: {
        id: true,
        handle: true,
        displayName: true,
        image: true,
        bio: true,
        isVerified: true,
        followersCount: true,
      },
    });

    const postWhere = {
      status: "PUBLISHED" as const,
      deletedAt: null,
      visibility: "PUBLIC" as const,
      publishedAt: { gte: windowStart },
      authorId: { notIn: authorExclude },
      author: { status: "ACTIVE" as const, isPrivate: false },
      ...(affinity.seenPostIds.length && !affinity.coldStart
        ? { id: { notIn: affinity.seenPostIds.slice(0, 40) } }
        : {}),
    };

    const posts = await prisma.post.findMany({
      where: {
        ...postWhere,
        ...(interestTerms.length
          ? {
              OR: interestTerms.slice(0, 8).map((name) => ({
                body: { contains: name, mode: "insensitive" as const },
              })),
            }
          : {}),
      },
      take: 50,
      orderBy: [{ likeCount: "desc" }, { publishedAt: "desc" }],
      include: {
        author: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            image: true,
            isVerified: true,
            isOfficial: true,
            isPrivate: true,
          },
        },
        media: true,
      },
    });

    const fallbackPosts =
      posts.length > 0
        ? posts
        : await prisma.post.findMany({
            where: postWhere,
            take: 50,
            orderBy: [{ likeCount: "desc" }, { publishedAt: "desc" }],
            include: {
              author: {
                select: {
                  id: true,
                  handle: true,
                  displayName: true,
                  image: true,
                  isVerified: true,
                  isOfficial: true,
                  isPrivate: true,
                },
              },
              media: true,
            },
          });

    const ranked = uniqueById(
      rankPosts(fallbackPosts, {
        followingIds: followingSet,
        friendIds: affinity.friendIds,
        interestTerms,
        authorAffinity: affinity.authorAffinity,
        diversify: true,
        maxPerAuthor: affinity.maxPerAuthor,
      }).slice(0, 20),
    );

    const videos = ranked
      .filter((p) => p.type === "VIDEO" || p.type === "SHORT")
      .slice(0, 8);

    const communityWhere = {
      visibility: "PUBLIC" as const,
      ...(interestTerms.length
        ? {
            OR: interestTerms.slice(0, 5).flatMap((term) => [
              { name: { contains: term, mode: "insensitive" as const } },
              { category: { contains: term, mode: "insensitive" as const } },
              {
                description: { contains: term, mode: "insensitive" as const },
              },
            ]),
          }
        : {}),
    };

    const communities = await prisma.community.findMany({
      take: 8,
      orderBy: { membersCount: "desc" },
      where: communityWhere,
      select: {
        id: true,
        slug: true,
        name: true,
        membersCount: true,
        image: true,
        category: true,
      },
    });

    const friendSeeds = [...(affinity.friendIds ?? [])]
      .filter((id) => !authorExclude.includes(id) && !blocked.includes(id))
      .slice(0, 8);
    const friends = friendSeeds.length
      ? await prisma.user.findMany({
          where: {
            id: { in: friendSeeds },
            status: "ACTIVE",
            isPrivate: false,
          },
          select: {
            id: true,
            handle: true,
            displayName: true,
            image: true,
            isVerified: true,
          },
        })
      : creators.slice(0, 4);

    const topics = interestTerms.length
      ? interestTerms.slice(0, 8).map((topic, index) => ({
          topic,
          score: Math.max(1, 12 - index),
        }))
      : [
          { topic: "design", score: 1 },
          { topic: "photography", score: 1 },
          { topic: "technology", score: 1 },
        ];

    return {
      userId,
      posts: ranked,
      videos,
      creators,
      friends,
      communities:
        communities.length > 0
          ? communities
          : await prisma.community.findMany({
              take: 8,
              orderBy: { membersCount: "desc" },
              where: { visibility: "PUBLIC" },
              select: {
                id: true,
                slug: true,
                name: true,
                membersCount: true,
                image: true,
                category: true,
              },
            }),
      topics,
      engine: affinity.coldStart ? "cold-start+rank" : "affinity+rank",
      coldStart: affinity.coldStart,
      generatedAt: new Date().toISOString(),
    };
  });
}
