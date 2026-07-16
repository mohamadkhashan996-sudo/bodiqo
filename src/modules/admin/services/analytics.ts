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

export async function getAnalytics(rangeDays = 30) {
  return cached(`admin:analytics:${rangeDays}`, 60, async () => {
    const since = daysAgo(rangeDays);
    const days: Array<{
      date: string;
      newUsers: number;
      posts: number;
      videos: number;
      stories: number;
      messages: number;
    }> = [];

    for (let i = rangeDays - 1; i >= 0; i--) {
      const from = daysAgo(i);
      const to = daysAgo(i - 1);
      const [newUsers, posts, videos, stories, messages] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: from, lt: to } } }),
        prisma.post.count({ where: { createdAt: { gte: from, lt: to } } }),
        prisma.post.count({
          where: {
            createdAt: { gte: from, lt: to },
            type: { in: ["VIDEO", "SHORT"] },
          },
        }),
        prisma.story.count({ where: { createdAt: { gte: from, lt: to } } }),
        prisma.message.count({ where: { createdAt: { gte: from, lt: to } } }),
      ]);
      days.push({
        date: from.toISOString().slice(0, 10),
        newUsers,
        posts,
        videos,
        stories,
        messages,
      });
    }

    const [dau, mau, communityGrowth, topCountries, topDevices] =
      await Promise.all([
        prisma.user.count({
          where: { lastSeenAt: { gte: daysAgo(1) }, status: "ACTIVE" },
        }),
        prisma.user.count({
          where: { lastSeenAt: { gte: daysAgo(30) }, status: "ACTIVE" },
        }),
        prisma.community.count({ where: { createdAt: { gte: since } } }),
        prisma.user.groupBy({
          by: ["country"],
          where: { country: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { country: "desc" } },
          take: 10,
        }),
        prisma.loginHistory.findMany({
          where: { createdAt: { gte: since }, success: true },
          select: { userAgent: true },
          take: 500,
        }),
      ]);

    const deviceCounts = new Map<string, number>();
    for (const row of topDevices) {
      const ua = row.userAgent ?? "unknown";
      const label = /mobile|iphone|android/i.test(ua)
        ? "Mobile"
        : /mac|windows|linux/i.test(ua)
          ? "Desktop"
          : "Other";
      deviceCounts.set(label, (deviceCounts.get(label) ?? 0) + 1);
    }

    return {
      rangeDays,
      userGrowth: days.map((d) => ({ date: d.date, value: d.newUsers })),
      postsPerDay: days.map((d) => ({ date: d.date, value: d.posts })),
      videosPerDay: days.map((d) => ({ date: d.date, value: d.videos })),
      storiesPerDay: days.map((d) => ({ date: d.date, value: d.stories })),
      messagesPerDay: days.map((d) => ({ date: d.date, value: d.messages })),
      dau,
      mau,
      communityGrowth,
      topCountries: topCountries.map((c) => ({
        country: c.country ?? "Unknown",
        count: c._count._all,
      })),
      topDevices: [...deviceCounts.entries()].map(([device, count]) => ({
        device,
        count,
      })),
      popularFeatures: [
        { feature: "Feed", score: days.reduce((s, d) => s + d.posts, 0) },
        { feature: "Messages", score: days.reduce((s, d) => s + d.messages, 0) },
        { feature: "Stories", score: days.reduce((s, d) => s + d.stories, 0) },
        { feature: "Videos", score: days.reduce((s, d) => s + d.videos, 0) },
      ].sort((a, b) => b.score - a.score),
    };
  });
}

export async function getMonitoringSnapshot() {
  return cached("admin:monitoring", 20, async () => {
    const [errors, security, apiHints, dbCounts] = await Promise.all([
      prisma.securityEvent.count({
        where: {
          severity: { in: ["error", "critical"] },
          createdAt: { gte: daysAgo(1) },
        },
      }),
      prisma.securityEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.auditLog.count({ where: { createdAt: { gte: daysAgo(1) } } }),
      Promise.all([
        prisma.user.count(),
        prisma.post.count(),
        prisma.message.count(),
        prisma.mediaAsset.aggregate({ _sum: { sizeBytes: true } }),
      ]),
    ]);

    return {
      errorsLast24h: errors,
      auditEventsLast24h: apiHints,
      securityLogs: security,
      database: {
        users: dbCounts[0],
        posts: dbCounts[1],
        messages: dbCounts[2],
        storageBytes: dbCounts[3]._sum.sizeBytes ?? 0,
      },
      server: {
        uptimeSec: Math.floor(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        node: process.version,
      },
      performance: {
        cache: "memory",
        note: "Attach APM (OpenTelemetry) in production for deep traces",
      },
    };
  });
}
