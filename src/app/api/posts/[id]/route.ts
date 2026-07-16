import { PostVisibility } from "@prisma/client";
import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  deletePost,
  serializePost,
  updatePost,
} from "@/modules/feed/services/posts";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: {
        author: { select: { id: true, handle: true, name: true, image: true } },
        media: true,
        hashtags: { include: { hashtag: true } },
      },
    });
    return post
      ? ok({ post: serializePost(post) })
      : ok({ error: "Post not found" }, 404);
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    const { id } = await params;
    return ok({
      post: await updatePost(
        u.id,
        id,
        await body(
          r,
          z.object({
            body: z.string().max(10000).optional(),
            visibility: z.nativeEnum(PostVisibility).optional(),
            commentsEnabled: z.boolean().optional(),
          }),
        ),
      ),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    const { id } = await params;
    await deletePost(u.id, id);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
