import { MediaKind } from "@prisma/client";
import { z } from "zod";

import {
  body,
  fail,
  guardApiAbuse,
  ok,
  optionalUser,
  requireUser,
} from "@/lib/api";
import { AppError } from "@/lib/errors";
import { optionalMediaUrlSchema } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/modules/admin/services/settings";
import { broadcastComment } from "@/modules/feed/services/broadcast";
import {
  addComment,
  type CommentSort,
  listComments,
  serializeComment,
} from "@/modules/feed/services/comments";
import {
  createNotification,
  notifyMentions,
} from "@/modules/notifications/services/notify";

export async function GET(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(r, "posts:id:comments:get", 90);
    const u = await optionalUser();
    const q = new URL(r.url).searchParams;
    const sort = (q.get("sort") === "top" ? "top" : "newest") as CommentSort;
    return ok(
      await listComments(
        (await params).id,
        u?.id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 30),
        sort,
      ),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(r, "posts:id:comments:post");
    const comments =
      (await getSetting<{ enabled?: boolean }>("comments")) ?? {};
    if (comments.enabled === false) {
      throw new AppError("Comments are temporarily disabled", 403);
    }
    const u = await requireUser();
    const postId = (await params).id;
    const d = await body(
      r,
      z.object({
        body: z.string().max(5000).default(""),
        parentId: z.string().optional(),
        mediaUrl: optionalMediaUrlSchema,
        mediaKind: z.nativeEnum(MediaKind).optional(),
      }),
    );
    const { comment, commentCount } = await addComment(
      u.id,
      postId,
      d.body,
      d.parentId,
      d.mediaUrl
        ? { url: d.mediaUrl, kind: d.mediaKind }
        : undefined,
    );
    const dto = await serializeComment(comment, u.id);
    if (d.parentId) {
      dto.replyCount = 0;
      dto.replies = [];
    }

    broadcastComment({
      type: "created",
      postId,
      comment: dto,
      commentCount,
    });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    const notified = new Set<string>([u.id]);
    const href = `/post/${postId}`;

    if (post && !notified.has(post.authorId)) {
      notified.add(post.authorId);
      await createNotification({
        userId: post.authorId,
        actorId: u.id,
        type: d.parentId ? "REPLY" : "COMMENT",
        postId,
        href,
        body: d.body.slice(0, 180),
      }).catch(() => undefined);
    }

    if (d.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: d.parentId },
        select: { authorId: true },
      });
      if (parent && !notified.has(parent.authorId)) {
        notified.add(parent.authorId);
        await createNotification({
          userId: parent.authorId,
          actorId: u.id,
          type: "REPLY",
          postId,
          href,
          body: d.body.slice(0, 180),
        }).catch(() => undefined);
      }
    }

    if (d.body.trim()) {
      await notifyMentions({
        actorId: u.id,
        text: d.body,
        postId,
        href,
        excludeUserIds: [...notified],
      }).catch(() => undefined);
    }

    return ok({ comment: dto, commentCount }, 201);
  } catch (e) {
    return fail(e);
  }
}
