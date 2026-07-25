import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { sendFriendshipRequest } from "@/modules/users/services/friends";
import { listFriendRequests } from "@/modules/users/services/lists";
import {
  respondFriendRequest,
  sendFriendRequest,
} from "@/modules/users/services/social";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "social:friend-request:get", 60, 60000);
    const u = await requireUser();
    return ok(await listFriendRequests(u.id));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(r: Request) {
  try {
    await guardApiAbuse(r, "social:friend-request:post");
    const u = await requireUser();
    const input = await body(
      r,
      z.object({
        toUserId: z.string().min(1),
        /** FRIEND = mutual friendship; FOLLOW = private follow request. */
        kind: z.enum(["FRIEND", "FOLLOW"]).default("FRIEND"),
      }),
    );
    if (input.kind === "FRIEND") {
      return ok(
        { request: await sendFriendshipRequest(u.id, input.toUserId) },
        201,
      );
    }
    return ok(
      { request: await sendFriendRequest(u.id, input.toUserId) },
      201,
    );
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(r: Request) {
  try {
    await guardApiAbuse(r, "social:friend-request:patch");
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
