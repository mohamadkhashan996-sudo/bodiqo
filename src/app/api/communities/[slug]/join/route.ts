import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { toggleMembership } from "@/modules/communities/services/communities";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await guardApiAbuse(request, "communities:slug:join:post");
    const user = await requireUser();
    const { slug } = await context.params;
    return ok(await toggleMembership(user.id, slug));
  } catch (error) {
    return fail(error);
  }
}
