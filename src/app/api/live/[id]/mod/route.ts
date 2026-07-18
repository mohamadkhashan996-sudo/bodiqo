import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  addModerator,
  blockViewer,
  muteViewer,
  pinLiveChat,
  removeModerator,
} from "@/modules/live/services/sessions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "live:mod:post", 20);
    const user = await requireUser();
    const input = await body(
      request,
      z.discriminatedUnion("action", [
        z.object({
          action: z.literal("add"),
          userId: z.string().min(1),
        }),
        z.object({
          action: z.literal("remove"),
          userId: z.string().min(1),
        }),
        z.object({
          action: z.literal("mute"),
          userId: z.string().min(1),
          muted: z.boolean(),
        }),
        z.object({
          action: z.literal("block"),
          userId: z.string().min(1),
        }),
        z.object({
          action: z.literal("pin"),
          messageId: z.string().min(1).nullable(),
        }),
      ]),
    );
    const sessionId = (await params).id;
    if (input.action === "add") {
      return ok({
        moderator: await addModerator(user.id, sessionId, input.userId),
      });
    }
    if (input.action === "remove") {
      return ok(await removeModerator(user.id, sessionId, input.userId));
    }
    if (input.action === "block") {
      return ok(await blockViewer(user.id, sessionId, input.userId));
    }
    if (input.action === "pin") {
      return ok(await pinLiveChat(user.id, sessionId, input.messageId));
    }
    return ok(await muteViewer(user.id, sessionId, input.userId, input.muted));
  } catch (e) {
    return fail(e);
  }
}
