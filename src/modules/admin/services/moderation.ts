import { Prisma, type ReportCategory, type ReportStatus, type ReportTarget, type Role } from "@prisma/client";

import { cacheDelPrefix } from "@/lib/cache";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { broadcastComment } from "@/modules/feed/services/broadcast";
import {
  moderateDeleteCommentSubtree,
  moderateRestoreComment,
} from "@/modules/feed/services/comments";

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
  kind:
    | "posts"
    | "stories"
    | "videos"
    | "comments"
    | "communities"
    | "deleted"
    | "messages";
  q?: string;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(opts.take ?? 40, 100);

  if (opts.kind === "messages") {
    const where: Prisma.MessageWhereInput = {};
    if (opts.q) {
      where.OR = [
        { body: { contains: opts.q } },
        { id: opts.q },
      ];
    }
    return prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      include: {
        sender: {
          select: { id: true, handle: true, displayName: true },
        },
        conversation: { select: { id: true, type: true } },
      },
    });
  }

  if (
    opts.kind === "posts" ||
    opts.kind === "videos" ||
    opts.kind === "deleted"
  ) {
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
  if (action === "delete") {
    const result = await moderateDeleteCommentSubtree(commentId);
    await writeAudit({
      actorId,
      action: "admin.content.comment.delete",
      target: commentId,
    });
    broadcastComment({
      type: "deleted",
      postId: result.postId,
      commentId: result.id,
      parentId: result.parentId,
      commentCount: result.commentCount,
      deletedIds: result.deletedIds,
    });
    return result;
  }

  const updated = await moderateRestoreComment(commentId);
  await writeAudit({
    actorId,
    action: "admin.content.comment.restore",
    target: commentId,
  });
  return updated;
}

export async function moderateMessage(
  actorId: string,
  messageId: string,
  action: "delete" | "restore",
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, deletedForAll: true, body: true },
  });
  if (!message) throw new AppError("Message not found", 404);

  if (action === "delete") {
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedForAll: true,
        body: "",
        mediaUrl: null,
        mediaMeta: Prisma.JsonNull,
        linkPreview: Prisma.JsonNull,
        ciphertext: null,
        nonce: null,
        senderEphemeralKey: null,
        isEncrypted: false,
      },
    });
    await writeAudit({
      actorId,
      action: "admin.content.message.delete",
      target: messageId,
    });
    return updated;
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { deletedForAll: false },
  });
  await writeAudit({
    actorId,
    action: "admin.content.message.restore",
    target: messageId,
  });
  return updated;
}

export async function deleteStory(actorId: string, storyId: string) {
  await prisma.story.delete({ where: { id: storyId } }).catch(() => {
    throw new AppError("Story not found", 404);
  });
  await writeAudit({
    actorId,
    action: "admin.content.story.delete",
    target: storyId,
  });
  return { ok: true };
}

export async function moderateCommunity(
  actorId: string,
  communityId: string,
  action: "hide" | "unhide" | "delete",
) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });
  if (!community) throw new AppError("Community not found", 404);

  if (action === "delete") {
    await prisma.community.delete({ where: { id: communityId } });
    await writeAudit({
      actorId,
      action: "admin.content.community.delete",
      target: communityId,
    });
    await cacheDelPrefix("admin:");
    return { ok: true, deleted: true };
  }

  const updated = await prisma.community.update({
    where: { id: communityId },
    data: {
      visibility: action === "hide" ? "PRIVATE" : "PUBLIC",
    },
  });
  await writeAudit({
    actorId,
    action: `admin.content.community.${action}`,
    target: communityId,
  });
  await cacheDelPrefix("admin:");
  return updated;
}

async function resolveReportTargetUserId(report: {
  targetType: ReportTarget;
  targetId: string;
}) {
  if (report.targetType === "USER") return report.targetId;
  if (report.targetType === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: report.targetId },
      select: { authorId: true },
    });
    return post?.authorId ?? null;
  }
  if (report.targetType === "COMMENT") {
    const comment = await prisma.comment.findUnique({
      where: { id: report.targetId },
      select: { authorId: true },
    });
    return comment?.authorId ?? null;
  }
  if (report.targetType === "STORY") {
    const story = await prisma.story.findUnique({
      where: { id: report.targetId },
      select: { authorId: true },
    });
    return story?.authorId ?? null;
  }
  if (report.targetType === "COMMUNITY") {
    const community = await prisma.community.findUnique({
      where: { id: report.targetId },
      select: { ownerId: true },
    });
    return community?.ownerId ?? null;
  }
  if (report.targetType === "MESSAGE") {
    const message = await prisma.message.findUnique({
      where: { id: report.targetId },
      select: { senderId: true },
    });
    return message?.senderId ?? null;
  }
  return null;
}

export async function resolveReportWithAction(
  actorId: string,
  actorRole: Role,
  reportId: string,
  action:
    | "delete_post"
    | "delete_comment"
    | "delete_message"
    | "delete_story"
    | "ban_user"
    | "none",
) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError("Report not found", 404);

  let outcome: unknown = null;
  if (action === "delete_post" && report.targetType === "POST") {
    outcome = await moderatePost(actorId, report.targetId, "delete");
  } else if (action === "delete_comment" && report.targetType === "COMMENT") {
    outcome = await moderateComment(actorId, report.targetId, "delete");
  } else if (action === "delete_message" && report.targetType === "MESSAGE") {
    outcome = await moderateMessage(actorId, report.targetId, "delete");
  } else if (action === "delete_story" && report.targetType === "STORY") {
    outcome = await deleteStory(actorId, report.targetId);
  } else if (action === "ban_user") {
    const targetUserId = await resolveReportTargetUserId(report);
    if (!targetUserId) {
      throw new AppError("Could not resolve user for this report", 400);
    }
    const { banUser } = await import("./users");
    outcome = await banUser(actorId, actorRole, targetUserId, {
      permanent: false,
      reason: `Banned from report ${reportId}: ${report.reason}`,
    });
  }

  const updated = await updateReport(actorId, reportId, {
    status: "RESOLVED",
    resolution:
      action === "none"
        ? "Reviewed with no automated action"
        : `Resolved with action: ${action}`,
  });

  return { report: updated, outcome };
}

export async function getModerationSummary() {
  const [
    open,
    inReview,
    escalated,
    bannedUsers,
    suspendedUsers,
    deletedPosts,
    recentReports,
  ] = await Promise.all([
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.report.count({ where: { status: "IN_REVIEW" } }),
    prisma.report.count({ where: { status: "ESCALATED" } }),
    prisma.user.count({ where: { status: "BANNED" } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.post.count({ where: { status: "DELETED" } }),
    prisma.report.findMany({
      where: { status: { in: ["OPEN", "IN_REVIEW", "ESCALATED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        reporter: {
          select: { id: true, handle: true, displayName: true, image: true },
        },
      },
    }),
  ]);

  return {
    counts: {
      open,
      inReview,
      escalated,
      bannedUsers,
      suspendedUsers,
      deletedPosts,
      queue: open + inReview + escalated,
    },
    recentReports,
  };
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
