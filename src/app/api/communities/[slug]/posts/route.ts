import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { optionalMediaUrlSchema } from "@/lib/media-url";
import {
  createCommunityPost,
  deleteCommunityPost,
} from "@/modules/communities/services/communities";

const createSchema = z.object({
  body: z.string().min(1).max(10000),
  mediaUrl: optionalMediaUrlSchema,
  isPinned: z.boolean().optional(),
  isAnnouncement: z.boolean().optional(),
});

const deleteSchema = z.object({
  postId: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await guardApiAbuse(request, "communities:slug:posts:post");
    const user = await requireUser();
    const { slug } = await context.params;
    const input = await body(request, createSchema);
    const post = await createCommunityPost(user.id, slug, input);
    return ok({ post }, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await guardApiAbuse(request, "communities:slug:posts:delete");
    const user = await requireUser();
    const { slug } = await context.params;
    const input = await body(request, deleteSchema);
    return ok(await deleteCommunityPost(user.id, slug, input.postId));
  } catch (error) {
    return fail(error);
  }
}
