import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import {
  deleteLiveChat,
  listLiveChat,
  postLiveChat,
} from "@/modules/live/services/sessions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "live:chat:get", 90);
    await requireUser();
    const q = new URL(request.url).searchParams;
    const sessionId = (await params).id;
    const { getPinnedLiveChat } = await import(
      "@/modules/live/services/sessions"
    );
    return ok({
      messages: await listLiveChat(sessionId, Number(q.get("limit") ?? 50)),
      pinned: await getPinnedLiveChat(sessionId),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "live:chat:post", 40);
    const user = await requireUser();
    const input = await body(
      request,
      z.object({ body: z.string().min(1).max(280) }),
    );
    return ok(
      {
        message: await postLiveChat(user.id, (await params).id, input.body),
      },
      201,
    );
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "live:chat:delete", 40);
    const user = await requireUser();
    const q = new URL(request.url).searchParams;
    const messageId = q.get("messageId");
    if (!messageId) throw new AppError("messageId required", 400);
    return ok(await deleteLiveChat(user.id, (await params).id, messageId));
  } catch (e) {
    return fail(e);
  }
}
