import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { deleteMessage, editMessage } from "@/modules/messaging/services/messages";
import {
  broadcastMessageDeleted,
  broadcastMessageUpdated,
} from "@/modules/messaging/services/broadcast";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "messages:id:patch");
    const user = await requireUser();
    const input = await body(
      request,
      z.object({ body: z.string().min(1).max(10000) }),
    );
    const message = await editMessage(user.id, (await params).id, input.body);
    broadcastMessageUpdated(message.conversationId, message);
    return ok({ message });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "messages:id:delete");
    const user = await requireUser();
    const messageId = (await params).id;
    const forEveryone =
      new URL(request.url).searchParams.get("forEveryone") === "true";
    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    const deleted = await deleteMessage(user.id, messageId, forEveryone);
    if (existing) {
      broadcastMessageDeleted(existing.conversationId, {
        messageId,
        forEveryone,
        userId: user.id,
      });
    }
    return ok({ deleted });
  } catch (error) {
    return fail(error);
  }
}
