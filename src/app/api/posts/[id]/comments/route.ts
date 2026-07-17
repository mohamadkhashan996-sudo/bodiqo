import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { addComment, listComments } from "@/modules/feed/services/comments";
import {
  createNotification,
  notifyMentions,
} from "@/modules/notifications/services/notify";
import { prisma } from "@/lib/prisma";

export async function GET(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const q = new URL(r.url).searchParams;
    return ok(
      await listComments(
        (await params).id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 30),
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
    const u = await requireUser();
    const postId = (await params).id;
    const d = await body(
      r,
      z.object({
        body: z.string().min(1).max(5000),
        parentId: z.string().optional(),
      }),
    );
    const comment = await addComment(u.id, postId, d.body, d.parentId);
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

    await notifyMentions({
      actorId: u.id,
      text: d.body,
      postId,
      href,
      excludeUserIds: [...notified],
    }).catch(() => undefined);

    return ok({ comment }, 201);
  } catch (e) {
    return fail(e);
  }
}
