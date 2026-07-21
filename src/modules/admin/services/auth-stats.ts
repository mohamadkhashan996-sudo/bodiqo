import { cached } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function getAuthAdminStats() {
  return cached("admin:auth-stats", 30, async () => {
    const since = daysAgo(30);
    const [
      totalUsers,
      verifiedUsers,
      withPassword,
      logins30,
      failed30,
      recentLogins,
      failedLogins,
      byProvider,
    ] = await Promise.all([
      prisma.user.count({ where: { status: { not: "DELETED" } } }),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
      prisma.user.count({ where: { passwordHash: { not: null } } }),
      prisma.loginHistory.count({
        where: { success: true, createdAt: { gte: since } },
      }),
      prisma.loginHistory.count({
        where: { success: false, createdAt: { gte: since } },
      }),
      prisma.loginHistory.findMany({
        where: { success: true },
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          user: { select: { email: true, handle: true } },
        },
      }),
      prisma.loginHistory.findMany({
        where: { success: false },
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          user: { select: { email: true, handle: true } },
        },
      }),
      prisma.loginHistory.groupBy({
        by: ["provider"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    return {
      totals: {
        users: totalUsers,
        verifiedUsers,
        withPassword,
        logins30d: logins30,
        failed30d: failed30,
      },
      loginsByProvider: byProvider.map((p) => ({
        provider: p.provider ?? "unknown",
        count: p._count._all,
      })),
      recentLogins,
      failedLogins,
    };
  });
}
