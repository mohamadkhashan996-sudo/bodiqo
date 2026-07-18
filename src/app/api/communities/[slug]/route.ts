import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { optionalMediaUrlSchema } from "@/lib/media-url";
import {
  getCommunity,
  updateCommunity,
} from "@/modules/communities/services/communities";

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(2000).nullable().optional(),
  rules: z.string().max(4000).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  image: optionalMediaUrlSchema.nullable(),
  coverImage: optionalMediaUrlSchema.nullable(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireUser();
    const { slug } = await context.params;
    return ok(await getCommunity(slug, user.id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await guardApiAbuse(request, "communities:slug:patch", 20);
    const user = await requireUser();
    const { slug } = await context.params;
    const input = await body(request, updateSchema);
    const community = await updateCommunity(user.id, slug, input);
    return ok({ community });
  } catch (error) {
    return fail(error);
  }
}
