import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { setMemberRole } from "@/modules/communities/services/communities";

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MODERATOR", "MEMBER"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await guardApiAbuse(request, "communities:slug:members:patch", 20);
    const user = await requireUser();
    const { slug } = await context.params;
    const input = await body(request, roleSchema);
    const member = await setMemberRole(
      user.id,
      slug,
      input.userId,
      input.role,
    );
    return ok({ member });
  } catch (error) {
    return fail(error);
  }
}
