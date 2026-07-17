import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/** Soft cleanup jobs — expired stories, scheduled posts, old search history, revoked sessions */
export async function runAutomaticCleanup() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60_000);

  try {
    const { publishScheduledPosts } = await import(
      "@/modules/feed/services/posts"
    );
    const scheduled = await publishScheduledPosts(now);
    const { expireStories } = await import("@/modules/media/services/stories");
    const expiredStories = await expireStories(now);
    const [search, sessions, media] = await Promise.all([
      prisma.searchHistory.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } }),
      prisma.deviceSession.deleteMany({
        where: { revokedAt: { not: null, lt: thirtyDaysAgo } },
      }),
      prisma.mediaAsset.deleteMany({
        where: { status: "DELETED", createdAt: { lt: ninetyDaysAgo } },
      }),
    ]);
    logger.info("cleanup_completed", {
      scheduled: scheduled.published,
      stories: expiredStories.count,
      search: search.count,
      sessions: sessions.count,
      media: media.count,
    });
    return {
      scheduled: scheduled.published,
      stories: expiredStories.count,
      search: search.count,
      sessions: sessions.count,
      media: media.count,
    };
  } catch (error) {
    logger.error("cleanup_failed", { error: String(error) });
    return null;
  }
}
