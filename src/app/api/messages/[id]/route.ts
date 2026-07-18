import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  broadcastMessageDeleted,
  broadcastMessageNew,
  broadcastMessageUpdated,
} from "@/modules/messaging/services/broadcast";
import {
  deleteMessage,
  editMessage,
  forwardMessage,
} from "@/modules/messaging/services/messages";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "messages:id:patch");
    const user = await requireUser();
    const input = await body(
      request,
      z.object({
        body: z.string().max(10000).optional(),
        ciphertext: z.string().max(200_000).optional(),
        nonce: z.string().max(256).optional(),
        senderEphemeralKey: z.string().max(2048).optional(),
      }),
    );
    const message = await editMessage(
      user.id,
      (await params).id,
      input.body ?? "",
      input.ciphertext && input.nonce
        ? {
            ciphertext: input.ciphertext,
            nonce: input.nonce,
            senderEphemeralKey: input.senderEphemeralKey,
          }
        : undefined,
    );
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "messages:id:forward", 40);
    const user = await requireUser();
    const input = await body(
      request,
      z.object({
        action: z.literal("forward"),
        conversationId: z.string().min(1),
      }),
    );
    const message = await forwardMessage(
      user.id,
      (await params).id,
      input.conversationId,
    );
    await broadcastMessageNew(input.conversationId, user.id, message);
    return ok({ message }, 201);
  } catch (error) {
    return fail(error);
  }
}
