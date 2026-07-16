import { MediaKind } from "@prisma/client";
import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import {
  createStory,
  listActiveStories,
} from "@/modules/media/services/stories";
export async function GET() {
  try {
    const u = await requireUser();
    return ok({ stories: await listActiveStories(u.id) });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(r: Request) {
  try {
    const u = await requireUser();
    const d = await body(
      r,
      z.object({
        mediaUrl: z.string().url(),
        mediaKind: z.nativeEnum(MediaKind).optional(),
        textOverlay: z.string().max(500).optional(),
      }),
    );
    return ok({ story: await createStory(u.id, d) }, 201);
  } catch (e) {
    return fail(e);
  }
}
