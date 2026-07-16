import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { reactMessage } from "@/modules/messaging/services/messages";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const input = await body(request, z.object({ emoji: z.string().min(1).max(32) }));
    return ok({ reaction: await reactMessage(user.id, (await params).id, input.emoji) }, 201);
  } catch (error) { return fail(error); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const emoji = new URL(request.url).searchParams.get("emoji");
    if (!emoji) throw new Error("emoji is required");
    return ok({ deleted: await reactMessage(user.id, (await params).id, emoji, true) });
  } catch (error) { return fail(error); }
}
