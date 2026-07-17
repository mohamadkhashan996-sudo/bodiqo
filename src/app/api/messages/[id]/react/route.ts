import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { reactMessage } from "@/modules/messaging/services/messages";
import { broadcastMessageReaction } from "@/modules/messaging/services/broadcast";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "messages:id:react:post");
    const user = await requireUser();
    const messageId = (await params).id;
    const input = await body(
      request,
      z.object({ emoji: z.string().min(1).max(32) }),
    );
    const reaction = await reactMessage(user.id, messageId, input.emoji);
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (message) {
      broadcastMessageReaction(message.conversationId, {
        messageId,
        reaction: { emoji: input.emoji, userId: user.id, ...reaction },
      });
    }
    return ok({ reaction }, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "messages:id:react:delete");
    const user = await requireUser();
    const messageId = (await params).id;
    const emoji = new URL(request.url).searchParams.get("emoji");
    if (!emoji) throw new AppError("emoji is required", 400);
    const deleted = await reactMessage(user.id, messageId, emoji, true);
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (message) {
      broadcastMessageReaction(message.conversationId, {
        messageId,
        reaction: { emoji, userId: user.id, removed: true },
      });
    }
    return ok({ deleted });
  } catch (error) {
    return fail(error);
  }
}
