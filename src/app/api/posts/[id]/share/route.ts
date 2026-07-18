import { ShareChannel } from "@prisma/client";
import { z } from "zod";

import {
  body,
  fail,
  guardApiAbuse,
  ok,
  optionalUser,
  requireUser,
} from "@/lib/api";
import { trackServer } from "@/lib/analytics-server";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  sharePost,
  sharePostInternally,
} from "@/modules/feed/services/share";
import { broadcastMessageNew } from "@/modules/messaging/services/broadcast";
import { createNotification } from "@/modules/notifications/services/notify";

const shareSchema = z.object({
  channel: z.nativeEnum(ShareChannel).optional(),
  recipientId: z.string().min(1).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "posts:id:share:post", 40);
    const postId = (await params).id;
    const input = await body(request, shareSchema).catch(() => ({
      channel: undefined as ShareChannel | undefined,
      recipientId: undefined as string | undefined,
    }));

    if (input.channel === "INTERNAL" || input.recipientId) {
      const viewer = await requireUser();
      if (!input.recipientId) {
        throw new AppError("Pick someone to share with", 400);
      }
      const result = await sharePostInternally(
        viewer.id,
        postId,
        input.recipientId,
      );
      await broadcastMessageNew(
        result.conversationId,
        viewer.id,
        result.message,
      );
      trackServer("post_share", {
        postId,
        channel: "INTERNAL",
        counted: result.counted,
      });
      return ok({
        post: { id: postId, shareCount: result.shareCount },
        conversationId: result.conversationId,
        counted: result.counted,
        channel: "INTERNAL",
      });
    }

    const viewer = await optionalUser();
    const shared = await sharePost(postId, viewer?.id, input.channel);

    if (viewer?.id && shared.counted) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      if (post && post.authorId !== viewer.id) {
        await createNotification({
          userId: post.authorId,
          actorId: viewer.id,
          type: "SHARE",
          postId,
          href: `/post/${postId}`,
        }).catch(() => undefined);
      }
    }

    trackServer("post_share", {
      postId,
      channel: shared.channel,
      counted: shared.counted,
    });

    return ok({
      post: { id: shared.id, shareCount: shared.shareCount },
      counted: shared.counted,
      channel: shared.channel,
    });
  } catch (e) {
    return fail(e);
  }
}
