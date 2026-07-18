import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { bookmarkPost, unbookmarkPost } from "@/modules/feed/services/bookmarks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "posts:id:bookmark:post");
    const u = await requireUser();
    const input = await body(
      request,
      z
        .object({
          collectionId: z.string().min(1).optional(),
          note: z.string().max(500).optional(),
        })
        .optional(),
    ).catch(() => undefined);
    const bookmark = await bookmarkPost(u.id, (await params).id, input);
    return ok({ bookmark, bookmarked: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(_r, "posts:id:bookmark:delete");
    const u = await requireUser();
    const result = await unbookmarkPost(u.id, (await params).id);
    return ok({ ...result, bookmarked: false });
  } catch (e) {
    return fail(e);
  }
}
