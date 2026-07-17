import { fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { countUnread } from "@/modules/notifications/services/notify";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "notifications:unread:get", 60, 60000);
    const user = await requireUser();
    return ok({ count: await countUnread(user.id) });
  } catch (error) {
    return fail(error);
  }
}
