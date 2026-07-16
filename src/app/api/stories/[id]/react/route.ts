import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { reactStory } from "@/modules/media/services/stories";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await requireUser();
    const { emoji } = await body(
      r,
      z.object({ emoji: z.string().min(1).max(16) }),
    );
    return ok({ reaction: await reactStory(u.id, (await params).id, emoji) });
  } catch (e) {
    return fail(e);
  }
}
