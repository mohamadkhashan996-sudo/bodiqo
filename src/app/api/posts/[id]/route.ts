import { PostVisibility } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, optionalUser, requireUser } from "@/lib/api";
import {
  archivePost,
  deletePost,
  getPostById,
  unarchivePost,
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
    await guardApiAbuse(r, "posts:id:patch");
    const u = await requireUser();
    const { id } = await params;
    const input = await body(
      r,
      z.object({
        body: z.string().max(10000).optional(),
        visibility: z.nativeEnum(PostVisibility).optional(),
        commentsEnabled: z.boolean().optional(),
        isPinned: z.boolean().optional(),
        locationName: z.string().max(120).nullable().optional(),
        locationLat: z.number().min(-90).max(90).nullable().optional(),
        locationLng: z.number().min(-180).max(180).nullable().optional(),
        archive: z.boolean().optional(),
      }),
    );

    if (input.archive === true) {
      return ok({ post: await archivePost(u.id, id) });
    }
    if (input.archive === false) {
      return ok({ post: await unarchivePost(u.id, id) });
    }

    const patch = {
      body: input.body,
      visibility: input.visibility,
      commentsEnabled: input.commentsEnabled,
      isPinned: input.isPinned,
      locationName: input.locationName,
      locationLat: input.locationLat,
      locationLng: input.locationLng,
    };
    return ok({
      post: await updatePost(u.id, id, patch),
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
    await guardApiAbuse(_r, "posts:id:delete");
    const u = await requireUser();
    const { id } = await params;
    await deletePost(u.id, id);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
