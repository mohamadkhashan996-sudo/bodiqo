import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { votePoll } from "@/modules/feed/services/posts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "posts:poll:vote", 40);
    const user = await requireUser();
    const { id } = await params;
    const { optionId } = await body(
      request,
      z.object({ optionId: z.string().min(1) }),
    );
    return ok({ post: await votePoll(user.id, id, optionId) });
  } catch (e) {
    return fail(e);
  }
}
