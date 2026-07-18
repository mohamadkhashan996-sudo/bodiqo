import { CollectionVisibility } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  createCollection,
  listCollections,
} from "@/modules/feed/services/bookmarks";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "bookmarks:collections:get", 60);
    const user = await requireUser();
    return ok(await listCollections(user.id));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "bookmarks:collections:post", 30);
    const user = await requireUser();
    const input = await body(
      request,
      z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(280).optional(),
        visibility: z.nativeEnum(CollectionVisibility).optional(),
      }),
    );
    const collection = await createCollection(user.id, input);
    return ok({ collection }, 201);
  } catch (error) {
    return fail(error);
  }
}
