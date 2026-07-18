import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { isWebPushConfigured, vapidPublicKey } from "@/lib/web-push";
import {
  deletePushSubscription,
  upsertPushSubscription,
} from "@/modules/notifications/services/push";

export async function GET() {
  try {
    await requireUser();
    const publicKey = vapidPublicKey();
    return ok({
      configured: isWebPushConfigured(),
      publicKey,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "notifications:push:post", 60);
    const user = await requireUser();
    if (!isWebPushConfigured()) {
      throw new AppError("Push notifications are not configured", 503);
    }
    const input = await body(
      request,
      z.object({
        endpoint: z.string().url().max(2048),
        keys: z.object({
          p256dh: z.string().min(1).max(512),
          auth: z.string().min(1).max(512),
        }),
      }),
    );
    const subscription = await upsertPushSubscription(user.id, {
      ...input,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return ok({ subscription: { id: subscription.id } }, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await guardApiAbuse(request, "notifications:push:delete", 60);
    const user = await requireUser();
    const endpoint =
      new URL(request.url).searchParams.get("endpoint") ?? undefined;
    await deletePushSubscription(user.id, endpoint);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
