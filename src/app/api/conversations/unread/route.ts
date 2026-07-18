import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getUnreadMessageCount } from "@/modules/messaging/services/conversations";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "conversations:unread:get", 60);
    const user = await requireUser();
    return ok({ count: await getUnreadMessageCount(user.id) });
  } catch (error) {
    return fail(error);
  }
}
