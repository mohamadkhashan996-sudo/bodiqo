import { fail, ok, requireUser } from "@/lib/api";
import { countUnread } from "@/modules/notifications/services/notify";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ count: await countUnread(user.id) });
  } catch (error) {
    return fail(error);
  }
}
