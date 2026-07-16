import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/cache";

export async function getSmartRecommendations(userId: string) {
  return cached(`reco:${userId}`, 45, async () => {
    const [following, likes, interests] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      prisma.postLike.findMany({
        where: { userId },
        take: 40,
        orderBy: { createdAt: "desc" },
        include: { post: { select: { authorId: true } } },
      }),
      prisma.userInterest.findMany({
        where: { userId },
        include: { interest: true },
      }),
    ]);

    const followingIds = following.map((f) => f.followingId);
    const likedAuthorIds = likes.map((l) => l.post.authorId);
    const interestNames = interests.map((i) => i.interest.name.toLowerCase());
    const exclude = [userId, ...followingIds];

    const creators = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        id: { notIn: exclude },
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

    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
        authorId: { not: userId },
        ...(interestNames.length
          ? {
              OR: interestNames.map((name) => ({
                body: { contains: name },
              })),
            }
          : {}),
      },
      take: 20,
      orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
      include: {
        author: {
          select: {
            handle: true,
            displayName: true,
            image: true,
            isVerified: true,
          },
        },
        media: true,
      },
    });

    const fallbackPosts =
      posts.length > 0
        ? posts
        : await prisma.post.findMany({
            where: {
              status: "PUBLISHED",
              visibility: "PUBLIC",
              authorId: { not: userId },
            },
            take: 20,
            orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
            include: {
              author: {
                select: {
                  handle: true,
                  displayName: true,
                  image: true,
                  isVerified: true,
                },
              },
              media: true,
            },
          });

    const videos = fallbackPosts
      .filter((p) => p.type === "VIDEO" || p.type === "SHORT")
      .slice(0, 8);

    const communities = await prisma.community.findMany({
      take: 8,
      orderBy: { membersCount: "desc" },
      include: {
        owner: { select: { handle: true, displayName: true } },
      },
    });

    const friendSeeds = [...new Set(likedAuthorIds)].filter(
      (id) => !exclude.includes(id),
    );
    const friends = friendSeeds.length
      ? await prisma.user.findMany({
          where: { id: { in: friendSeeds.slice(0, 8) }, status: "ACTIVE" },
          select: {
            id: true,
            handle: true,
            displayName: true,
            image: true,
            isVerified: true,
          },
        })
      : creators.slice(0, 4);

    const topics = interestNames.length
      ? interestNames.map((name) => ({ topic: name, score: 1 }))
      : [
          { topic: "design", score: 1 },
          { topic: "photography", score: 1 },
          { topic: "technology", score: 1 },
        ];

    return {
      userId,
      posts: fallbackPosts,
      videos,
      creators,
      friends,
      communities,
      topics,
      generatedAt: new Date().toISOString(),
    };
  });
}
