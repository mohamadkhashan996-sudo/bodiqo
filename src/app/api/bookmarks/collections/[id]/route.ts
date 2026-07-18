import { CollectionVisibility } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  deleteCollection,
  updateCollection,
} from "@/modules/feed/services/bookmarks";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "bookmarks:collections:id:patch", 40);
    const user = await requireUser();
    const input = await body(
      request,
      z.object({
        name: z.string().min(1).max(80).optional(),
        description: z.string().max(280).nullable().optional(),
        visibility: z.nativeEnum(CollectionVisibility).optional(),
        sortOrder: z.number().int().min(0).max(1000).optional(),
      }),
    );
    const collection = await updateCollection(
      user.id,
      (await params).id,
      input,
    );
    return ok({ collection });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(_request, "bookmarks:collections:id:delete", 30);
    const user = await requireUser();
    return ok(await deleteCollection(user.id, (await params).id));
  } catch (error) {
    return fail(error);
  }
}
