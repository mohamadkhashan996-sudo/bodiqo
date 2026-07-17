import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/cache";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

export async function getDashboardOverview() {
  return cached("admin:overview", 30, async () => {
    const now = new Date();
    const day = startOfDay();
    const week = daysAgo(7);
    const month = daysAgo(30);
    const onlineCutoff = new Date(now.getTime() - 5 * 60_000);

    const [
      totalUsers,
      activeUsers,
      onlineUsers,
      newUsers,
      totalPosts,
      totalStories,
      totalVideos,
      totalCommunities,
      totalMessages,
      openReports,
      bannedUsers,
      suspendedUsers,
      verificationPending,
      mediaBytes,
      dailyPosts,
      weeklyPosts,
      monthlyPosts,
      dailyMessages,
      weeklyMessages,
      monthlyMessages,
    ] = await Promise.all([
      prisma.user.count({ where: { status: { not: "DELETED" } } }),
      prisma.user.count({
        where: {
          status: "ACTIVE",
          lastSeenAt: { gte: daysAgo(7) },
        },
      }),
      prisma.user.count({
        where: {
          OR: [
            { presence: "ONLINE" },
            { lastSeenAt: { gte: onlineCutoff } },
          ],
        },
      }),
      prisma.user.count({ where: { createdAt: { gte: day } } }),
      prisma.post.count({ where: { status: { not: "DELETED" } } }),
      prisma.story.count(),
      prisma.post.count({
        where: { type: { in: ["VIDEO", "SHORT"] }, status: { not: "DELETED" } },
      }),
      prisma.community.count(),
      prisma.message.count({ where: { deletedForAll: false } }),
      prisma.report.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
      prisma.user.count({ where: { status: "BANNED" } }),
      prisma.user.count({ where: { status: "SUSPENDED" } }),
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      prisma.mediaAsset.aggregate({
        _sum: { sizeBytes: true },
        where: { status: { not: "DELETED" } },
      }),
      prisma.post.count({ where: { createdAt: { gte: day } } }),
      prisma.post.count({ where: { createdAt: { gte: week } } }),
      prisma.post.count({ where: { createdAt: { gte: month } } }),
      prisma.message.count({ where: { createdAt: { gte: day } } }),
      prisma.message.count({ where: { createdAt: { gte: week } } }),
      prisma.message.count({ where: { createdAt: { gte: month } } }),
    ]);

    return {
      totals: {
        users: totalUsers,
        activeUsers,
        onlineUsers,
        newUsers,
        posts: totalPosts,
        stories: totalStories,
        videos: totalVideos,
        communities: totalCommunities,
        messages: totalMessages,
        openReports,
        bannedUsers,
        suspendedUsers,
        verificationPending,
      },
      activity: {
        daily: { posts: dailyPosts, messages: dailyMessages },
        weekly: { posts: weeklyPosts, messages: weeklyMessages },
        monthly: { posts: monthlyPosts, messages: monthlyMessages },
      },
      health: {
        server: "healthy",
        database: "healthy",
        storageBytes: mediaBytes._sum.sizeBytes ?? 0,
        revenueReady: true,
      },
      generatedAt: now.toISOString(),
    };
  });
}
