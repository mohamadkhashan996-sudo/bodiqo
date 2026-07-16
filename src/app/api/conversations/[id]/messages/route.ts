import { z } from "zod";
import { MessageType } from "@prisma/client";
import { body, fail, ok, requireUser } from "@/lib/api";
import { optionalMediaUrlSchema } from "@/lib/media-url";
import {
  listMessages,
  sendMessage,
  type SendMessageInput,
} from "@/modules/messaging/services/messages";

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
    const user = await requireUser();
    const input = await body(
      request,
      z.object({
        type: z.nativeEnum(MessageType).default("TEXT"),
        body: z.string().max(10000).default(""),
        mediaUrl: optionalMediaUrlSchema,
        replyToId: z.string().optional(),
        mediaMeta: z.unknown().optional(),
        linkPreview: z.unknown().optional(),
        isEncrypted: z.boolean().optional(),
        ciphertext: z.string().max(200000).optional(),
        nonce: z.string().max(128).optional(),
        senderEphemeralKey: z.string().max(4000).optional(),
      }),
    );
    return ok(
      {
        message: await sendMessage(
          user.id,
          (await params).id,
          input as unknown as SendMessageInput,
        ),
      },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
