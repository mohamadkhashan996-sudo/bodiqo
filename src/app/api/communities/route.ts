import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { optionalMediaUrlSchema } from "@/lib/media-url";
import {
  createCommunity,
  listCommunities,
} from "@/modules/communities/services/communities";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  image: optionalMediaUrlSchema.nullable(),
  coverImage: optionalMediaUrlSchema.nullable(),
  rules: z.string().max(4000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
});

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listCommunities(user.id));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "communities:write", 15);
    const user = await requireUser();
    const input = await body(request, createSchema);
    const community = await createCommunity(user.id, input);
    return ok({ community }, 201);
  } catch (error) {
    return fail(error);
  }
}
