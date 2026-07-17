import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  listJoinRequests,
  resolveJoinRequest,
} from "@/modules/communities/services/communities";

const resolveSchema = z.object({
  memberId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireUser();
    const { slug } = await context.params;
    return ok(await listJoinRequests(user.id, slug));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await guardApiAbuse(request, "communities:slug:requests:post", 30);
    const user = await requireUser();
    const { slug } = await context.params;
    const input = await body(request, resolveSchema);
    return ok(
      await resolveJoinRequest(user.id, slug, input.memberId, input.action),
    );
  } catch (error) {
    return fail(error);
  }
}
