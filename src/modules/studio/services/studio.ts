import { AppError } from "@/lib/errors";
import { cached } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

const MUSIC_LIBRARY = [
  {
    id: "ml-sunrise",
    title: "Sunrise Drift",
    artist: "Relune Library",
    durationSec: 142,
    genre: "Ambient",
    license: "Royalty-free for Relune posts & shorts",
  },
  {
    id: "ml-pulse",
    title: "City Pulse",
    artist: "Relune Library",
    durationSec: 98,
    genre: "Electronic",
    license: "Royalty-free for Relune posts & shorts",
  },
  {
    id: "ml-warm",
    title: "Warm Tape",
    artist: "Relune Library",
    durationSec: 176,
    genre: "Lo-fi",
    license: "Royalty-free for Relune posts & shorts",
  },
  {
    id: "ml-night",
    title: "Night Walk",
    artist: "Relune Library",
    durationSec: 121,
    genre: "Cinematic",
    license: "Royalty-free for Relune posts & shorts",
  },
  {
    id: "ml-spark",
    title: "Sparkline",
    artist: "Relune Library",
    durationSec: 87,
    genre: "Pop",
    license: "Royalty-free for Relune posts & shorts",
  },
  {
    id: "ml-orbit",
    title: "Soft Orbit",
    artist: "Relune Library",
    durationSec: 154,
    genre: "Chill",
    license: "Royalty-free for Relune posts & shorts",
  },
] as const;

export function getStudioMusicLibrary() {
  return {
    tracks: MUSIC_LIBRARY.map((t) => ({ ...t })),
    note: "Browse Relune’s starter music catalog. Attaching tracks to posts/shorts ships in a later release.",
  };
}

export async function getStudioDashboard(userId: string) {
  return cached(`studio:dash:${userId}`, 30, async () => {
    const since7 = daysAgo(7);
    const since30 = daysAgo(30);

    const myPostIds = (
      await prisma.post.findMany({
        where: { authorId: userId },
        select: { id: true },
        take: 500,
      })
    ).map((p) => p.id);

    const [
      user,
      published,
      drafts,
      scheduled,
      archived,
      videos,
      views7,
      views30,
      newFollowers7,
      giftCoins30,
      openReports,
      pendingVerification,
      liveMods,
      communitiesOwned,
      wallet,
    ] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          handle: true,
          displayName: true,
          name: true,
          image: true,
          isVerified: true,
          followersCount: true,
          followingCount: true,
          postsCount: true,
          videosCount: true,
        },
      }),
      prisma.post.count({
        where: { authorId: userId, deletedAt: null, status: "PUBLISHED" },
      }),
      prisma.post.count({
        where: { authorId: userId, deletedAt: null, status: "DRAFT" },
      }),
      prisma.post.count({
        where: { authorId: userId, deletedAt: null, status: "SCHEDULED" },
      }),
      prisma.post.count({
        where: { authorId: userId, deletedAt: null, status: "ARCHIVED" },
      }),
      prisma.post.count({
        where: {
          authorId: userId,
          deletedAt: null,
          status: "PUBLISHED",
          type: { in: ["VIDEO", "SHORT"] },
        },
      }),
      prisma.postView.count({
        where: { createdAt: { gte: since7 }, post: { authorId: userId } },
      }),
      prisma.postView.count({
        where: { createdAt: { gte: since30 }, post: { authorId: userId } },
      }),
      prisma.follow.count({
        where: { followingId: userId, createdAt: { gte: since7 } },
      }),
      prisma.liveGiftEvent.aggregate({
        where: { hostId: userId, createdAt: { gte: since30 } },
        _sum: { coinCost: true },
        _count: { _all: true },
      }),
      prisma.report.count({
        where: {
          status: { in: ["OPEN", "IN_REVIEW", "ESCALATED"] },
          OR: [
            ...(myPostIds.length
              ? [{ targetType: "POST" as const, targetId: { in: myPostIds } }]
              : []),
            { targetType: "USER", targetId: userId },
          ],
        },
      }),
      prisma.verificationRequest.findFirst({
        where: {
          userId,
          status: { in: ["PENDING", "NEEDS_INFO"] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, category: true },
      }),
      prisma.liveModerator.count({ where: { userId } }),
      prisma.community.count({ where: { ownerId: userId } }),
      prisma.liveWallet.findUnique({
        where: { userId },
        select: { coins: true },
      }),
    ]);

    return {
      profile: user,
      counts: {
        published,
        drafts,
        scheduled,
        archived,
        videos,
        followers: user.followersCount,
        views7,
        views30,
        newFollowers7,
        openReports,
        liveMods,
        communitiesOwned,
      },
      monetization: {
        walletCoins: wallet?.coins ?? 0,
        giftCoins30d: giftCoins30._sum.coinCost ?? 0,
        giftEvents30d: giftCoins30._count._all,
      },
      verification: {
        isVerified: user.isVerified,
        pending: pendingVerification,
      },
      links: {
        composer: "/home",
        live: "/live/go",
        shortsUpload: "/shorts",
        verification: "/settings/verification",
      },
    };
  });
}

export async function getStudioAnalytics(userId: string, rangeDays = 30) {
  const days = Math.min(Math.max(rangeDays, 7), 90);
  return cached(`studio:analytics:${userId}:${days}`, 45, async () => {
    const since = daysAgo(days);

    const [
      posts,
      viewRows,
      followerRows,
      giftRows,
      totals,
      topPosts,
      wallet,
      supporters,
    ] = await Promise.all([
      prisma.post.findMany({
        where: {
          authorId: userId,
          deletedAt: null,
          status: "PUBLISHED",
          publishedAt: { gte: since },
        },
        select: {
          id: true,
          type: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          publishedAt: true,
        },
      }),
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', pv."createdAt") AS day, COUNT(*)::bigint AS count
        FROM "PostView" pv
        INNER JOIN "Post" p ON p."id" = pv."postId"
        WHERE p."authorId" = ${userId} AND pv."createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Follow"
        WHERE "followingId" = ${userId} AND "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COALESCE(SUM("coinCost"), 0)::bigint AS count
        FROM "LiveGiftEvent"
        WHERE "hostId" = ${userId} AND "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      prisma.post.aggregate({
        where: { authorId: userId, deletedAt: null, status: "PUBLISHED" },
        _sum: {
          viewCount: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
        },
        _count: { _all: true },
      }),
      prisma.post.findMany({
        where: { authorId: userId, deletedAt: null, status: "PUBLISHED" },
        orderBy: { viewCount: "desc" },
        take: 8,
        select: {
          id: true,
          type: true,
          body: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          publishedAt: true,
        },
      }),
      prisma.liveWallet.findUnique({
        where: { userId },
        select: { coins: true },
      }),
      prisma.liveGiftEvent.groupBy({
        by: ["senderId"],
        where: { hostId: userId, createdAt: { gte: since } },
        _sum: { coinCost: true },
        _count: { _all: true },
        orderBy: { _sum: { coinCost: "desc" } },
        take: 10,
      }),
    ]);

    const viewMap = new Map(
      viewRows.map((r) => [
        new Date(r.day).toISOString().slice(0, 10),
        Number(r.count),
      ]),
    );
    const followerMap = new Map(
      followerRows.map((r) => [
        new Date(r.day).toISOString().slice(0, 10),
        Number(r.count),
      ]),
    );
    const giftMap = new Map(
      giftRows.map((r) => [
        new Date(r.day).toISOString().slice(0, 10),
        Number(r.count),
      ]),
    );

    const series: Array<{
      date: string;
      views: number;
      followers: number;
      giftCoins: number;
    }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = daysAgo(i).toISOString().slice(0, 10);
      series.push({
        date: d,
        views: viewMap.get(d) ?? 0,
        followers: followerMap.get(d) ?? 0,
        giftCoins: giftMap.get(d) ?? 0,
      });
    }

    const senderIds = supporters.map((s) => s.senderId);
    const senders = senderIds.length
      ? await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: {
            id: true,
            handle: true,
            displayName: true,
            name: true,
            image: true,
          },
        })
      : [];
    const senderMap = new Map(senders.map((s) => [s.id, s]));

    const videoViews = posts
      .filter((p) => p.type === "VIDEO" || p.type === "SHORT")
      .reduce((s, p) => s + p.viewCount, 0);

    return {
      rangeDays: days,
      totals: {
        posts: totals._count._all,
        views: totals._sum.viewCount ?? 0,
        likes: totals._sum.likeCount ?? 0,
        comments: totals._sum.commentCount ?? 0,
        shares: totals._sum.shareCount ?? 0,
        videoViews,
        walletCoins: wallet?.coins ?? 0,
        giftCoinsInRange: series.reduce((s, d) => s + d.giftCoins, 0),
        newFollowersInRange: series.reduce((s, d) => s + d.followers, 0),
      },
      series: {
        views: series.map((d) => ({ date: d.date, value: d.views })),
        followers: series.map((d) => ({ date: d.date, value: d.followers })),
        giftCoins: series.map((d) => ({ date: d.date, value: d.giftCoins })),
      },
      topPosts: topPosts.map((p) => ({
        id: p.id,
        type: p.type,
        preview: (p.body || "").slice(0, 100),
        views: p.viewCount,
        likes: p.likeCount,
        comments: p.commentCount,
        publishedAt: p.publishedAt,
      })),
      topSupporters: supporters.map((s) => {
        const u = senderMap.get(s.senderId);
        return {
          userId: s.senderId,
          handle: u?.handle ?? s.senderId,
          name: u?.displayName ?? u?.name ?? u?.handle ?? "supporter",
          image: u?.image ?? null,
          gifts: s._count._all,
          coins: s._sum.coinCost ?? 0,
        };
      }),
    };
  });
}

export async function getStudioFollowers(userId: string, limit = 40) {
  const take = Math.min(Math.max(limit, 1), 80);
  const [user, recent, growth7] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { handle: true, followersCount: true, followingCount: true },
    }),
    prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        follower: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            name: true,
            image: true,
            isVerified: true,
            followersCount: true,
          },
        },
      },
    }),
    prisma.follow.count({
      where: { followingId: userId, createdAt: { gte: daysAgo(7) } },
    }),
  ]);

  return {
    handle: user.handle,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    newFollowers7d: growth7,
    followers: recent.map((f) => ({
      ...f.follower,
      followedAt: f.createdAt,
    })),
  };
}

/** Gift supporters stand in for paid subscribers until CreatorPlan ships. */
export async function getStudioSubscribers(userId: string) {
  const since = daysAgo(90);
  const groups = await prisma.liveGiftEvent.groupBy({
    by: ["senderId"],
    where: { hostId: userId, createdAt: { gte: since } },
    _sum: { coinCost: true },
    _count: { _all: true },
    orderBy: { _sum: { coinCost: "desc" } },
    take: 50,
  });
  const users = groups.length
    ? await prisma.user.findMany({
        where: { id: { in: groups.map((g) => g.senderId) } },
        select: {
          id: true,
          handle: true,
          displayName: true,
          name: true,
          image: true,
          isVerified: true,
        },
      })
    : [];
  const map = new Map(users.map((u) => [u.id, u]));

  return {
    paidSubscriptions: {
      available: false,
      note: "Paid CreatorPlan subscribers are planned after live gifts monetization expands.",
    },
    giftSupporters: groups.map((g) => {
      const u = map.get(g.senderId);
      return {
        userId: g.senderId,
        handle: u?.handle ?? g.senderId,
        name: u?.displayName ?? u?.name ?? u?.handle ?? "supporter",
        image: u?.image ?? null,
        isVerified: u?.isVerified ?? false,
        gifts: g._count._all,
        coins: g._sum.coinCost ?? 0,
      };
    }),
  };
}

export async function getStudioContent(
  userId: string,
  opts: {
    status?: "PUBLISHED" | "DRAFT" | "SCHEDULED" | "ARCHIVED" | "ALL";
    type?: "ALL" | "VIDEO" | "SHORT" | "TEXT" | "IMAGE" | "POLL" | "LINK" | "REPOST";
    limit?: number;
  } = {},
) {
  const take = Math.min(Math.max(opts.limit ?? 40, 1), 80);
  const status = opts.status ?? "ALL";
  const type = opts.type ?? "ALL";

  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      deletedAt: null,
      ...(status === "ALL"
        ? { status: { in: ["PUBLISHED", "DRAFT", "SCHEDULED", "ARCHIVED"] } }
        : { status }),
      ...(type === "ALL" ? {} : { type }),
    },
    orderBy: [{ updatedAt: "desc" }],
    take,
    select: {
      id: true,
      type: true,
      status: true,
      body: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      scheduledAt: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      media: {
        select: { url: true, kind: true, thumbUrl: true },
        take: 1,
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return {
    posts: posts.map((p) => ({
      id: p.id,
      type: p.type,
      status: p.status,
      preview: (p.body || "").slice(0, 120),
      views: p.viewCount,
      likes: p.likeCount,
      comments: p.commentCount,
      shares: p.shareCount,
      scheduledAt: p.scheduledAt,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      thumb: p.media[0]?.thumbUrl || p.media[0]?.url || null,
      mediaKind: p.media[0]?.kind ?? null,
    })),
  };
}

export async function getStudioVideos(userId: string, limit = 40) {
  const take = Math.min(Math.max(limit, 1), 80);
  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      deletedAt: null,
      type: { in: ["VIDEO", "SHORT"] },
      status: { in: ["PUBLISHED", "DRAFT", "SCHEDULED", "ARCHIVED"] },
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      status: true,
      body: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      scheduledAt: true,
      publishedAt: true,
      updatedAt: true,
      media: {
        select: { url: true, kind: true, thumbUrl: true, duration: true },
        take: 1,
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return {
    videos: posts.map((p) => ({
      id: p.id,
      type: p.type,
      status: p.status,
      preview: (p.body || "").slice(0, 120),
      views: p.viewCount,
      likes: p.likeCount,
      comments: p.commentCount,
      scheduledAt: p.scheduledAt,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      duration: p.media[0]?.duration ?? null,
      thumb: p.media[0]?.thumbUrl || p.media[0]?.url || null,
    })),
  };
}

export async function getStudioMonetization(userId: string) {
  const since = daysAgo(30);
  const [wallet, gifts, sessions, lifetime] = await Promise.all([
    prisma.liveWallet.findUnique({
      where: { userId },
      select: { coins: true, updatedAt: true },
    }),
    prisma.liveGiftEvent.findMany({
      where: { hostId: userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        gift: { select: { name: true, coinCost: true } },
        sender: {
          select: { handle: true, displayName: true, name: true, image: true },
        },
        session: { select: { id: true, title: true } },
      },
    }),
    prisma.liveSession.findMany({
      where: { hostId: userId },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        giftCoins: true,
        peakViewers: true,
        startedAt: true,
        endedAt: true,
      },
    }),
    prisma.liveGiftEvent.aggregate({
      where: { hostId: userId },
      _sum: { coinCost: true },
      _count: { _all: true },
    }),
  ]);

  const coins30 = await prisma.liveGiftEvent.aggregate({
    where: { hostId: userId, createdAt: { gte: since } },
    _sum: { coinCost: true },
    _count: { _all: true },
  });

  return {
    wallet: {
      coins: wallet?.coins ?? 0,
      updatedAt: wallet?.updatedAt ?? null,
    },
    summary: {
      giftCoins30d: coins30._sum.coinCost ?? 0,
      giftEvents30d: coins30._count._all,
      giftCoinsLifetime: lifetime._sum.coinCost ?? 0,
      giftEventsLifetime: lifetime._count._all,
    },
    recentGifts: gifts.map((g) => ({
      id: g.id,
      coins: g.coinCost,
      giftName: g.gift.name,
      createdAt: g.createdAt,
      sessionId: g.session.id,
      sessionTitle: g.session.title,
      sender: {
        handle: g.sender.handle,
        name: g.sender.displayName ?? g.sender.name ?? g.sender.handle,
        image: g.sender.image,
      },
    })),
    recentSessions: sessions,
    note: "Revenue reflects live gift coins only. Cash payouts and CreatorPlan subscriptions are planned.",
  };
}

export async function getStudioCopyright(userId: string) {
  const myPostIds = (
    await prisma.post.findMany({
      where: { authorId: userId },
      select: { id: true },
      take: 1000,
    })
  ).map((p) => p.id);

  const againstMe = myPostIds.length
    ? await prisma.report.findMany({
        where: {
          category: "COPYRIGHT",
          OR: [
            { targetType: "POST", targetId: { in: myPostIds } },
            { targetType: "USER", targetId: userId },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          status: true,
          reason: true,
          targetType: true,
          targetId: true,
          createdAt: true,
          resolvedAt: true,
        },
      })
    : [];

  return {
    policy: {
      title: "Copyright on Relune",
      body: "Only post content you own or have rights to use. To report infringement on someone else’s post, use Report → Copyright. Claims against your posts appear below for awareness; staff review outcomes in moderation.",
    },
    claimsAgainstYou: againstMe,
    howToReport: {
      path: "Open any post → Report → Copyright",
      category: "COPYRIGHT",
    },
  };
}

export async function getStudioReports(userId: string) {
  const myPostIds = (
    await prisma.post.findMany({
      where: { authorId: userId },
      select: { id: true },
      take: 1000,
    })
  ).map((p) => p.id);

  const reports = await prisma.report.findMany({
    where: {
      OR: [
        ...(myPostIds.length
          ? [{ targetType: "POST" as const, targetId: { in: myPostIds } }]
          : []),
        { targetType: "USER", targetId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      category: true,
      reason: true,
      targetType: true,
      targetId: true,
      createdAt: true,
      resolvedAt: true,
      resolution: true,
    },
  });

  return {
    reports,
    note: "Reports filed against your account or posts. Reporter identity is hidden. Staff resolve via moderation.",
  };
}

export async function getStudioCollab(userId: string) {
  const [moderatorOf, mySessions, communities, closeFriends] =
    await Promise.all([
      prisma.liveModerator.findMany({
        where: { userId },
        take: 20,
        include: {
          session: {
            select: {
              id: true,
              title: true,
              status: true,
              host: {
                select: { handle: true, displayName: true, name: true },
              },
            },
          },
        },
      }),
      prisma.liveSession.findMany({
        where: { hostId: userId },
        orderBy: { startedAt: "desc" },
        take: 5,
        include: {
          moderators: {
            include: {
              user: {
                select: {
                  id: true,
                  handle: true,
                  displayName: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      }),
      prisma.community.findMany({
        where: { ownerId: userId },
        take: 20,
        select: {
          id: true,
          name: true,
          slug: true,
          membersCount: true,
        },
      }),
      prisma.closeFriend.findMany({
        where: { userId },
        take: 30,
        include: {
          friend: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              name: true,
              image: true,
            },
          },
        },
      }),
    ]);

  return {
    liveModeratorRoles: moderatorOf.map((m) => ({
      sessionId: m.session.id,
      title: m.session.title,
      status: m.session.status,
      host:
        m.session.host.displayName ??
        m.session.host.name ??
        m.session.host.handle,
    })),
    myLiveMods: mySessions.flatMap((s) =>
      s.moderators.map((m) => ({
        sessionId: s.id,
        sessionTitle: s.title,
        sessionStatus: s.status,
        user: m.user,
      })),
    ),
    communities,
    closeFriends: closeFriends.map((c) => c.friend),
    note: "v1 collaboration = live moderators, communities you own, and close friends. Co-authored posts / duets are planned.",
  };
}

export async function publishStudioPostNow(authorId: string, postId: string) {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      authorId,
      deletedAt: null,
      status: { in: ["DRAFT", "SCHEDULED"] },
    },
  });
  if (!post) throw new AppError("Post not found", 404);

  const now = new Date();
  const shouldIncrementCounts = !post.publishedAt;
  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        publishedAt: post.publishedAt ?? now,
        scheduledAt: null,
      },
    });
    if (shouldIncrementCounts) {
      await tx.user.update({
        where: { id: authorId },
        data: {
          postsCount: { increment: 1 },
          ...(post.type === "VIDEO" || post.type === "SHORT"
            ? { videosCount: { increment: 1 } }
            : {}),
        },
      });
    }
  });

  try {
    const { invalidateFeedCaches } = await import(
      "@/modules/feed/services/posts"
    );
    await invalidateFeedCaches();
  } catch {
    /* optional */
  }

  return { id: postId, status: "PUBLISHED" as const, publishedAt: now };
}

export async function cancelStudioSchedule(authorId: string, postId: string) {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      authorId,
      deletedAt: null,
      status: "SCHEDULED",
    },
  });
  if (!post) throw new AppError("Scheduled post not found", 404);

  await prisma.post.update({
    where: { id: postId },
    data: { status: "DRAFT", scheduledAt: null },
  });
  return { id: postId, status: "DRAFT" as const };
}

export async function rescheduleStudioPost(
  authorId: string,
  postId: string,
  scheduledAtRaw: string,
) {
  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new AppError("Invalid schedule time", 400);
  }
  if (scheduledAt.getTime() <= Date.now() + 60_000) {
    throw new AppError("Schedule at least 1 minute in the future", 400);
  }

  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      authorId,
      deletedAt: null,
      status: { in: ["DRAFT", "SCHEDULED"] },
    },
  });
  if (!post) throw new AppError("Post not found", 404);

  await prisma.post.update({
    where: { id: postId },
    data: { status: "SCHEDULED", scheduledAt },
  });
  return { id: postId, status: "SCHEDULED" as const, scheduledAt };
}
