import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { searchMessages } from "@/modules/messaging/services/messages";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "messages:search:get", 90, 60000);
    const user = await requireUser();
    const query = new URL(request.url).searchParams;
    const q = query.get("q")?.trim();
    if (!q) return ok({ messages: [] });
    return ok({
      messages: await searchMessages(
        user.id,
        q,
        query.get("conversationId") ?? undefined,
      ),
    });
  } catch (error) {
    return fail(error);
  }
}
