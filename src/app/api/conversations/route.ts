import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { createGroup, getOrCreateDirect, listConversations } from "@/modules/messaging/services/conversations";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const query = new URL(request.url).searchParams;
    return ok(await listConversations(user.id, query.get("cursor") ?? undefined, Number(query.get("limit") ?? 30)));
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await body(request, z.union([
      z.object({ type: z.literal("DIRECT"), userId: z.string().min(1) }),
      z.object({ type: z.literal("GROUP"), title: z.string().min(1).max(120), memberIds: z.array(z.string().min(1)).min(1), image: z.string().url().optional(), description: z.string().max(2000).optional() }),
    ]));
    const conversation = input.type === "DIRECT" ? await getOrCreateDirect(user.id, input.userId) : await createGroup(user.id, input);
    return ok({ conversation }, 201);
  } catch (error) { return fail(error); }
}
