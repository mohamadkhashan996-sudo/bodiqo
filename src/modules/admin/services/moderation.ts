import { Prisma, ReportCategory, ReportStatus, ReportTarget } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { cacheDelPrefix } from "@/lib/cache";
import { writeAudit } from "./audit";

export async function listReports(opts: {
  status?: ReportStatus;
  category?: ReportCategory;
  targetType?: ReportTarget;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(opts.take ?? 40, 100);
  const where: Prisma.ReportWhereInput = {};
  if (opts.status) where.status = opts.status;
  if (opts.category) where.category = opts.category;
  if (opts.targetType) where.targetType = opts.targetType;

  return prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
    include: {
      reporter: {
        select: { id: true, handle: true, displayName: true, image: true },
      },
    },
  });
}

export async function updateReport(
  actorId: string,
  reportId: string,
  data: {
    status?: ReportStatus;
    category?: ReportCategory;
    resolution?: string;
    assigneeId?: string | null;
  },
) {
  const existing = await prisma.report.findUnique({ where: { id: reportId } });
  if (!existing) throw new AppError("Report not found", 404);

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: data.status,
      category: data.category,
      resolution: data.resolution,
      assigneeId: data.assigneeId === undefined ? undefined : data.assigneeId,
      resolvedAt:
        data.status === "RESOLVED" || data.status === "DISMISSED"
          ? new Date()
          : data.status
            ? null
            : undefined,
    },
  });
  await writeAudit({
    actorId,
    action: "admin.report.update",
    target: reportId,
    meta: data,
  });
  await cacheDelPrefix("admin:");
  return updated;
}

export async function listContent(opts: {
  kind: "posts" | "stories" | "videos" | "comments" | "communities" | "deleted";
  q?: string;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(opts.take ?? 40, 100);

  if (opts.kind === "posts" || opts.kind === "videos" || opts.kind === "deleted") {
    const where: Prisma.PostWhereInput =
      opts.kind === "deleted"
        ? { status: "DELETED" }
        : opts.kind === "videos"
          ? { type: { in: ["VIDEO", "SHORT"] }, status: { not: "DELETED" } }
          : { status: { not: "DELETED" } };
    if (opts.q) where.body = { contains: opts.q };
    return prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      include: {
        author: { select: { id: true, handle: true, displayName: true } },
        media: true,
      },
    });
  }

  if (opts.kind === "stories") {
    return prisma.story.findMany({
      orderBy: { createdAt: "desc" },
      take,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      include: {
        author: { select: { id: true, handle: true, displayName: true } },
      },
    });
  }

  if (opts.kind === "comments") {
    const where: Prisma.CommentWhereInput = { deletedAt: null };
    if (opts.q) where.body = { contains: opts.q };
    return prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      include: {
        author: { select: { id: true, handle: true, displayName: true } },
      },
    });
  }

  return prisma.community.findMany({
    orderBy: { createdAt: "desc" },
    take,
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
    include: {
      owner: { select: { id: true, handle: true, displayName: true } },
      _count: { select: { members: true, posts: true } },
    },
  });
}

export async function moderatePost(
  actorId: string,
  postId: string,
  action: "delete" | "restore" | "pin" | "unpin",
) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Post not found", 404);

  const data =
    action === "delete"
      ? { status: "DELETED" as const, deletedAt: new Date() }
      : action === "restore"
        ? { status: "PUBLISHED" as const, deletedAt: null }
        : action === "pin"
          ? { isPinned: true }
          : { isPinned: false };

  const updated = await prisma.post.update({ where: { id: postId }, data });
  await writeAudit({
    actorId,
    action: `admin.content.post.${action}`,
    target: postId,
  });
  await cacheDelPrefix("admin:");
  return updated;
}

export async function moderateComment(
  actorId: string,
  commentId: string,
  action: "delete" | "restore",
) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found", 404);
  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: action === "delete" ? new Date() : null },
  });
  await writeAudit({
    actorId,
    action: `admin.content.comment.${action}`,
    target: commentId,
  });
  return updated;
}

export async function deleteStory(actorId: string, storyId: string) {
  await prisma.story.delete({ where: { id: storyId } }).catch(() => {
    throw new AppError("Story not found", 404);
  });
  await writeAudit({ actorId, action: "admin.content.story.delete", target: storyId });
  return { ok: true };
}

export async function listHashtags(take = 40) {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", body: { contains: "#" } },
    select: { body: true },
    take: 500,
    orderBy: { createdAt: "desc" },
  });
  const counts = new Map<string, number>();
  for (const post of posts) {
    const tags = post.body.match(/#[\w]+/g) ?? [];
    for (const tag of tags) {
      const key = tag.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([tag, count]) => ({ tag, count }));
}
