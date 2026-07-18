import { cached } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

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

type DayCount = { day: Date; count: bigint | number };

function toDayMap(rows: DayCount[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    map.set(key, Number(row.count));
  }
  return map;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Active user = seen online recently OR device session touched OR content view. */
async function countActiveUsers(since: Date) {
  const [bySeen, byDevice, byView] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", lastSeenAt: { gte: since } },
      select: { id: true },
    }),
    prisma.deviceSession.findMany({
      where: { revokedAt: null, lastActiveAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.postView.findMany({
      where: { createdAt: { gte: since } },
      select: { viewerId: true },
      distinct: ["viewerId"],
    }),
  ]);
  return new Set([
    ...bySeen.map((u) => u.id),
    ...byDevice.map((d) => d.userId),
    ...byView.map((v) => v.viewerId),
  ]).size;
}

async function retentionRate(cohortDaysAgo: number, returnWithinDays: number) {
  const cohortStart = daysAgo(cohortDaysAgo + 1);
  const cohortEnd = daysAgo(cohortDaysAgo);
  const returnAfter = new Date(cohortEnd);
  returnAfter.setDate(returnAfter.getDate() + returnWithinDays);

  const cohort = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      createdAt: { gte: cohortStart, lt: cohortEnd },
    },
    select: { id: true, lastSeenAt: true },
  });
  if (!cohort.length) return { cohortSize: 0, returned: 0, rate: 0 };

  const returned = cohort.filter(
    (u) => u.lastSeenAt && u.lastSeenAt >= returnAfter,
  ).length;
  return {
    cohortSize: cohort.length,
    returned,
    rate: Math.round((returned / cohort.length) * 1000) / 10,
  };
}

export async function getAnalytics(rangeDays = 30) {
  return cached(`admin:analytics:v2:${rangeDays}`, 45, async () => {
    const since = daysAgo(rangeDays);
    const day1 = daysAgo(1);
    const day30 = daysAgo(30);

    const [
      userRows,
      postRows,
      videoRows,
      storyRows,
      messageRows,
      activeRows,
      viewRows,
      videoViewRows,
      dwellAgg,
      sessionRows,
      giftRows,
      communityRows,
      reportRows,
    ] = await Promise.all([
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "User" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Post" WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Post"
        WHERE "createdAt" >= ${since} AND "type" IN ('VIDEO', 'SHORT') AND "deletedAt" IS NULL
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Story" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Message" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', COALESCE("lastSeenAt", "createdAt")) AS day, COUNT(*)::bigint AS count
        FROM "User"
        WHERE "status" = 'ACTIVE' AND "lastSeenAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "PostView" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', pv."createdAt") AS day, COUNT(*)::bigint AS count
        FROM "PostView" pv
        INNER JOIN "Post" p ON p."id" = pv."postId"
        WHERE pv."createdAt" >= ${since} AND p."type" IN ('VIDEO', 'SHORT')
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.postView.aggregate({
        where: { createdAt: { gte: since }, dwellMs: { gt: 0 } },
        _sum: { dwellMs: true },
        _count: { _all: true },
      }),
      prisma.deviceSession.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, lastActiveAt: true },
        take: 5000,
        orderBy: { createdAt: "desc" },
      }),
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COALESCE(SUM("coinCost"), 0)::bigint AS count
        FROM "LiveGiftEvent" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Community" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Report" WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
    ]);

    const userMap = toDayMap(userRows);
    const postMap = toDayMap(postRows);
    const videoMap = toDayMap(videoRows);
    const storyMap = toDayMap(storyRows);
    const messageMap = toDayMap(messageRows);
    const activeMap = toDayMap(activeRows);
    const viewMap = toDayMap(viewRows);
    const videoViewMap = toDayMap(videoViewRows);
    const giftMap = toDayMap(giftRows);
    const communityMap = toDayMap(communityRows);
    const reportMap = toDayMap(reportRows);

    const days: Array<{
      date: string;
      newUsers: number;
      activeUsers: number;
      posts: number;
      videos: number;
      stories: number;
      messages: number;
      postViews: number;
      videoViews: number;
      giftCoins: number;
      communities: number;
      reports: number;
    }> = [];

    for (let i = rangeDays - 1; i >= 0; i--) {
      const from = daysAgo(i);
      const date = isoDay(from);
      const row = {
        date,
        newUsers: userMap.get(date) ?? 0,
        activeUsers: activeMap.get(date) ?? 0,
        posts: postMap.get(date) ?? 0,
        videos: videoMap.get(date) ?? 0,
        stories: storyMap.get(date) ?? 0,
        messages: messageMap.get(date) ?? 0,
        postViews: viewMap.get(date) ?? 0,
        videoViews: videoViewMap.get(date) ?? 0,
        giftCoins: giftMap.get(date) ?? 0,
        communities: communityMap.get(date) ?? 0,
        reports: reportMap.get(date) ?? 0,
      };
      days.push(row);
    }

    await Promise.all(
      days.map((row) => {
        const dayDate = new Date(`${row.date}T00:00:00.000Z`);
        return prisma.analyticsDaily.upsert({
          where: { date: dayDate },
          create: {
            date: dayDate,
            newUsers: row.newUsers,
            activeUsers: row.activeUsers,
            posts: row.posts,
            videos: row.videos,
            stories: row.stories,
            messages: row.messages,
            communities: row.communities,
            reports: row.reports,
          },
          update: {
            newUsers: row.newUsers,
            activeUsers: row.activeUsers,
            posts: row.posts,
            videos: row.videos,
            stories: row.stories,
            messages: row.messages,
            communities: row.communities,
            reports: row.reports,
          },
        });
      }),
    );

    const sessionDurations = sessionRows.map((s) =>
      Math.max(0, s.lastActiveAt.getTime() - s.createdAt.getTime()),
    );
    const sessions = sessionDurations.length;
    const avgSessionMs = sessions
      ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessions)
      : 0;
    const bounceCount = sessionDurations.filter((ms) => ms < 30_000).length;
    const bounceRate = sessions
      ? Math.round((bounceCount / sessions) * 1000) / 10
      : 0;
    const screenTimeMs = dwellAgg._sum.dwellMs ?? 0;

    const [
      dau,
      mau,
      communityGrowth,
      topCountriesAll,
      topDevices,
      retentionD1,
      retentionD7,
      retentionD30,
      postReach,
      videoViewTotal,
      topPosts,
      topCreators,
      topCountriesActive,
      onlineNow,
      viewsLast5m,
      postsLast5m,
      giftCoinsTotal,
      engagementSums,
    ] = await Promise.all([
      countActiveUsers(day1),
      countActiveUsers(day30),
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
      retentionRate(1, 1),
      retentionRate(7, 7),
      retentionRate(30, 30),
      prisma.postView
        .groupBy({
          by: ["postId"],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
        })
        .then((rows) => rows.length),
      prisma.postView.count({
        where: {
          createdAt: { gte: since },
          post: { type: { in: ["VIDEO", "SHORT"] } },
        },
      }),
      prisma.post.findMany({
        where: {
          deletedAt: null,
          status: "PUBLISHED",
          createdAt: { gte: since },
        },
        orderBy: { viewCount: "desc" },
        take: 8,
        select: {
          id: true,
          body: true,
          type: true,
          viewCount: true,
          likeCount: true,
          author: { select: { handle: true, displayName: true } },
        },
      }),
      prisma.post.groupBy({
        by: ["authorId"],
        where: {
          deletedAt: null,
          status: "PUBLISHED",
          createdAt: { gte: since },
        },
        _sum: { viewCount: true, likeCount: true },
        _count: { _all: true },
        orderBy: { _sum: { viewCount: "desc" } },
        take: 8,
      }),
      prisma.user.groupBy({
        by: ["country"],
        where: {
          country: { not: null },
          status: "ACTIVE",
          OR: [
            { lastSeenAt: { gte: day30 } },
            { deviceSessions: { some: { lastActiveAt: { gte: day30 } } } },
          ],
        },
        _count: { _all: true },
        orderBy: { _count: { country: "desc" } },
        take: 10,
      }),
      prisma.user.count({
        where: {
          status: "ACTIVE",
          OR: [
            { presence: "ONLINE" },
            { lastSeenAt: { gte: new Date(Date.now() - 5 * 60_000) } },
          ],
        },
      }),
      prisma.postView.count({
        where: { createdAt: { gte: new Date(Date.now() - 5 * 60_000) } },
      }),
      prisma.post.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 5 * 60_000) },
          deletedAt: null,
        },
      }),
      prisma.liveGiftEvent.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { coinCost: true },
        _count: { _all: true },
      }),
      prisma.post.aggregate({
        where: { createdAt: { gte: since }, deletedAt: null },
        _sum: { likeCount: true, commentCount: true, shareCount: true },
      }),
    ]);

    const creatorIds = topCreators.map((c) => c.authorId);
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: {
            id: true,
            handle: true,
            displayName: true,
            followersCount: true,
          },
        })
      : [];
    const creatorMap = new Map(creators.map((c) => [c.id, c]));

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

    const actions =
      days.reduce((s, d) => s + d.posts + d.messages + d.stories + d.postViews, 0) +
      (engagementSums._sum.likeCount ?? 0) +
      (engagementSums._sum.commentCount ?? 0) +
      (engagementSums._sum.shareCount ?? 0);
    const engagementPerDau = dau ? Math.round((actions / Math.max(dau, 1)) * 10) / 10 : 0;

    return {
      rangeDays,
      dau,
      mau,
      dauMauRatio: mau ? Math.round((dau / mau) * 1000) / 10 : 0,
      communityGrowth,
      retention: {
        d1: retentionD1,
        d7: retentionD7,
        d30: retentionD30,
      },
      engagement: {
        actions,
        perActiveUser: engagementPerDau,
        likes: engagementSums._sum.likeCount ?? 0,
        comments: engagementSums._sum.commentCount ?? 0,
        shares: engagementSums._sum.shareCount ?? 0,
      },
      sessions: {
        count: sessions,
        avgDurationMs: avgSessionMs,
        avgDurationSec: Math.round(avgSessionMs / 1000),
        bounceRate,
      },
      screenTime: {
        totalMs: screenTimeMs,
        totalMinutes: Math.round(screenTimeMs / 60_000),
        viewsWithDwell: dwellAgg._count._all,
      },
      postReach,
      videoViews: videoViewTotal,
      revenue: {
        giftCoins: giftCoinsTotal._sum.coinCost ?? 0,
        giftEvents: giftCoinsTotal._count._all,
        note: "Basic virtual gift coins — real-money revenue pending monetization launch",
      },
      realtime: {
        onlineNow,
        viewsLast5m,
        postsLast5m,
        refreshedAt: new Date().toISOString(),
      },
      userGrowth: days.map((d) => ({ date: d.date, value: d.newUsers })),
      activeUsersPerDay: days.map((d) => ({ date: d.date, value: d.activeUsers })),
      postsPerDay: days.map((d) => ({ date: d.date, value: d.posts })),
      videosPerDay: days.map((d) => ({ date: d.date, value: d.videos })),
      storiesPerDay: days.map((d) => ({ date: d.date, value: d.stories })),
      messagesPerDay: days.map((d) => ({ date: d.date, value: d.messages })),
      postViewsPerDay: days.map((d) => ({ date: d.date, value: d.postViews })),
      videoViewsPerDay: days.map((d) => ({
        date: d.date,
        value: d.videoViews,
      })),
      giftCoinsPerDay: days.map((d) => ({ date: d.date, value: d.giftCoins })),
      topCountries: topCountriesAll.map((c) => ({
        country: c.country ?? "Unknown",
        count: c._count._all,
      })),
      topCountriesActive: topCountriesActive.map((c) => ({
        country: c.country ?? "Unknown",
        count: c._count._all,
      })),
      topDevices: [...deviceCounts.entries()].map(([device, count]) => ({
        device,
        count,
      })),
      topPosts: topPosts.map((p) => ({
        id: p.id,
        type: p.type,
        preview: (p.body || "").slice(0, 80),
        views: p.viewCount,
        likes: p.likeCount,
        author: p.author.handle || p.author.displayName || "unknown",
      })),
      topCreators: topCreators.map((c) => {
        const u = creatorMap.get(c.authorId);
        return {
          userId: c.authorId,
          handle: u?.handle ?? c.authorId,
          name: u?.displayName ?? u?.handle ?? "creator",
          posts: c._count._all,
          views: c._sum.viewCount ?? 0,
          likes: c._sum.likeCount ?? 0,
          followers: u?.followersCount ?? 0,
        };
      }),
      popularFeatures: [
        { feature: "Feed", score: days.reduce((s, d) => s + d.posts, 0) },
        {
          feature: "Messages",
          score: days.reduce((s, d) => s + d.messages, 0),
        },
        { feature: "Stories", score: days.reduce((s, d) => s + d.stories, 0) },
        { feature: "Videos", score: days.reduce((s, d) => s + d.videos, 0) },
        {
          feature: "Views",
          score: days.reduce((s, d) => s + d.postViews, 0),
        },
      ].sort((a, b) => b.score - a.score),
    };
  });
}

export function analyticsToCsv(
  data: Awaited<ReturnType<typeof getAnalytics>>,
): string {
  const lines = [
    "date,newUsers,activeUsers,posts,videos,stories,messages,postViews,videoViews,giftCoins",
  ];
  const n = data.userGrowth.length;
  for (let i = 0; i < n; i++) {
    lines.push(
      [
        data.userGrowth[i]?.date,
        data.userGrowth[i]?.value,
        data.activeUsersPerDay[i]?.value,
        data.postsPerDay[i]?.value,
        data.videosPerDay[i]?.value,
        data.storiesPerDay[i]?.value,
        data.messagesPerDay[i]?.value,
        data.postViewsPerDay[i]?.value,
        data.videoViewsPerDay[i]?.value,
        data.giftCoinsPerDay[i]?.value,
      ].join(","),
    );
  }
  lines.push("");
  lines.push(`dau,${data.dau}`);
  lines.push(`mau,${data.mau}`);
  lines.push(`bounceRate,${data.sessions.bounceRate}`);
  lines.push(`avgSessionSec,${data.sessions.avgDurationSec}`);
  lines.push(`screenTimeMinutes,${data.screenTime.totalMinutes}`);
  lines.push(`postReach,${data.postReach}`);
  lines.push(`videoViews,${data.videoViews}`);
  lines.push(`giftCoins,${data.revenue.giftCoins}`);
  lines.push(`retentionD1,${data.retention.d1.rate}`);
  lines.push(`retentionD7,${data.retention.d7.rate}`);
  lines.push(`retentionD30,${data.retention.d30.rate}`);
  return lines.join("\n");
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

    const { recentErrors } = await import("@/lib/error-tracking");
    const { metricsSnapshot } = await import("@/lib/metrics");

    return {
      errorsLast24h: errors,
      auditEventsLast24h: apiHints,
      securityLogs: security,
      recentAppErrors: recentErrors().slice(0, 15),
      metrics: metricsSnapshot(),
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
        metricsPath: "/api/metrics",
        note: "Prometheus scrape + optional SENTRY_DSN; see docs/OBSERVABILITY.md",
      },
    };
  });
}
