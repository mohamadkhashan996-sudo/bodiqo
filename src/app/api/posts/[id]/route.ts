import { fail, ok, optionalUser } from "@/lib/api";
import { getPostById } from "@/modules/feed/services/posts";
import { PostVisibility } from "@prisma/client";
import { z } from "zod";
import { body, requireUser } from "@/lib/api";
import {
  deletePost,
  updatePost,
} from "@/modules/feed/services/posts";

export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await optionalUser();
    const { id } = await params;
    return ok({ post: await getPostById(id, u?.id) });
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
