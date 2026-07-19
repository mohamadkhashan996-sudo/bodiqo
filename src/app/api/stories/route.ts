import { MediaKind } from "@prisma/client";
import { z } from "zod";

import {
  body,
  fail,
  guardApiAbuse,
  ok,
  optionalUser,
  requireUser,
} from "@/lib/api";
import { mediaUrlSchema } from "@/lib/media-url";
import {
  createStory,
  listPublicStories,
} from "@/modules/media/services/stories";
import { requireFeature } from "@/modules/platform/feature-flags";

export async function GET() {
  try {
    await requireFeature("stories");
    const u = await optionalUser();
    return ok({ stories: await listPublicStories(u?.id) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(r: Request) {
  try {
    await guardApiAbuse(r, "stories:post");
    await requireFeature("stories");
    const u = await requireUser();
    const d = await body(
      r,
      z.object({
        mediaUrl: mediaUrlSchema,
        mediaKind: z.nativeEnum(MediaKind).optional(),
        textOverlay: z.string().max(500).optional(),
      }),
    );
    return ok({ story: await createStory(u.id, d) }, 201);
  } catch (e) {
    return fail(e);
  }
}
