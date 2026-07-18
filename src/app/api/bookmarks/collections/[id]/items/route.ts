import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import {
  addPostToCollection,
  removePostFromCollection,
} from "@/modules/feed/services/bookmarks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "bookmarks:collections:id:items:post", 40);
    const user = await requireUser();
    const { postId } = await body(
      request,
      z.object({ postId: z.string().min(1) }),
    );
    const item = await addPostToCollection(user.id, (await params).id, postId);
    return ok({ item, bookmarked: true }, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "bookmarks:collections:id:items:delete", 40);
    const user = await requireUser();
    const q = new URL(request.url).searchParams.get("postId");
    let postId = q;
    if (!postId) {
      const parsed = await body(
        request,
        z.object({ postId: z.string().min(1) }),
      ).catch(() => null);
      postId = parsed?.postId ?? null;
    }
    if (!postId) throw new AppError("postId required", 400);
    return ok(
      await removePostFromCollection(user.id, (await params).id, postId),
    );
  } catch (error) {
    return fail(error);
  }
}
