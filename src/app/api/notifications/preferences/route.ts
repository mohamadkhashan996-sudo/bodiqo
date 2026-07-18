import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/modules/notifications/services/prefs";

const patchSchema = z.object({
  social: z.boolean().optional(),
  messages: z.boolean().optional(),
  calls: z.boolean().optional(),
  live: z.boolean().optional(),
  community: z.boolean().optional(),
  product: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  hideMessagePreview: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ preferences: await getNotificationPreferences(user.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "notifications:prefs:patch", 40);
    const user = await requireUser();
    const patch = await body(request, patchSchema);
    return ok({
      preferences: await updateNotificationPreferences(user.id, patch),
    });
  } catch (error) {
    return fail(error);
  }
}
