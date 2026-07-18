import { MessageType, type Prisma } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { optionalMediaUrlSchema } from "@/lib/media-url";
import { broadcastMessageNew } from "@/modules/messaging/services/broadcast";
import {
  listMessages,
  sendMessage,
  type SendMessageInput,
} from "@/modules/messaging/services/messages";

const jsonValue = z.custom<Prisma.InputJsonValue>(
  (value) => value !== undefined,
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const q = new URL(request.url).searchParams;
    return ok(
      await listMessages(
        user.id,
        (await params).id,
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 50),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "conversations:id:messages:post");
    const user = await requireUser();
    const conversationId = (await params).id;
    const input: SendMessageInput = await body(
      request,
      z.object({
        type: z.nativeEnum(MessageType).default("TEXT"),
        body: z.string().max(10000).default(""),
        mediaUrl: optionalMediaUrlSchema,
        replyToId: z.string().optional(),
        mediaMeta: jsonValue.optional(),
        linkPreview: jsonValue.optional(),
        isEncrypted: z.boolean().optional(),
        ciphertext: z.string().max(200000).optional(),
        nonce: z.string().max(128).optional(),
        senderEphemeralKey: z.string().max(4000).optional(),
      }),
    );
    const message = await sendMessage(user.id, conversationId, input);
    await broadcastMessageNew(conversationId, user.id, message);
    return ok({ message }, 201);
  } catch (error) {
    return fail(error);
  }
}
