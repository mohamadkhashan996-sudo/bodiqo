import { z } from "zod";

import { AppError } from "@/lib/errors";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  cancelStudioSchedule,
  publishStudioPostNow,
  rescheduleStudioPost,
} from "@/modules/studio/services/studio";

export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "studio:posts:patch");
    const user = await requireUser();
    const input = await body(
      request,
      z.object({
        postId: z.string().min(1).max(64),
        action: z.enum(["publish_now", "cancel_schedule", "reschedule"]),
        scheduledAt: z.string().datetime().optional(),
      }),
    );

    if (input.action === "publish_now") {
      return ok(await publishStudioPostNow(user.id, input.postId));
    }
    if (input.action === "cancel_schedule") {
      return ok(await cancelStudioSchedule(user.id, input.postId));
    }
    if (!input.scheduledAt) {
      throw new AppError("scheduledAt required", 400);
    }
    return ok(
      await rescheduleStudioPost(user.id, input.postId, input.scheduledAt),
    );
  } catch (e) {
    return fail(e);
  }
}
