import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import {
  respondFriendRequest,
  sendFriendRequest,
} from "@/modules/users/services/social";
import { listFriendRequests } from "@/modules/users/services/lists";

export async function GET() {
  try {
    const u = await requireUser();
    return ok(await listFriendRequests(u.id));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(r: Request) {
  try {
    const u = await requireUser();
    const { toUserId } = await body(r, z.object({ toUserId: z.string() }));
    return ok({ request: await sendFriendRequest(u.id, toUserId) }, 201);
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(r: Request) {
  try {
    const u = await requireUser();
    const d = await body(
      r,
      z.object({
        requestId: z.string(),
        status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED"]),
      }),
    );
    return ok({
      request: await respondFriendRequest(u.id, d.requestId, d.status),
    });
  } catch (e) {
    return fail(e);
  }
}
