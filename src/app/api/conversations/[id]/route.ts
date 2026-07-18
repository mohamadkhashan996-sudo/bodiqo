import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  getConversation,
  leaveConversation,
  updateMemberFlags,
} from "@/modules/messaging/services/conversations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const conversation = await getConversation(user.id, (await params).id);
    return ok({ conversation });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "conversations:id:patch");
    const user = await requireUser();
    const input = await body(
      request,
      z.object({
        isPinned: z.boolean().optional(),
        isMuted: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        isFavorite: z.boolean().optional(),
        draftText: z.string().max(10000).nullable().optional(),
        action: z.enum(["accept_request", "decline_request"]).optional(),
      }),
    );
    const id = (await params).id;
    if (input.action === "accept_request") {
      const { acceptMessageRequest } = await import(
        "@/modules/messaging/services/conversations"
      );
      return ok({ member: await acceptMessageRequest(user.id, id) });
    }
    if (input.action === "decline_request") {
      const { declineMessageRequest } = await import(
        "@/modules/messaging/services/conversations"
      );
      return ok({ member: await declineMessageRequest(user.id, id) });
    }
    const { action: _action, ...flags } = input;
    return ok({
      member: await updateMemberFlags(user.id, id, flags),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "conversations:id:delete");
    const user = await requireUser();
    return ok({
      member: await leaveConversation(user.id, (await params).id),
    });
  } catch (error) {
    return fail(error);
  }
}
