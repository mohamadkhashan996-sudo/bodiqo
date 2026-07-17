import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { addComment, listComments } from "@/modules/feed/services/comments";
import { createNotification } from "@/modules/notifications/services/notify";
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
    if (post) {
      await createNotification({
        userId: post.authorId,
        actorId: u.id,
        type: d.parentId ? "REPLY" : "COMMENT",
        postId,
        body: d.body.slice(0, 180),
      }).catch(() => undefined);
    }
    return ok({ comment }, 201);
  } catch (e) {
    return fail(e);
  }
}
