import { fail, ok, requireUser } from "@/lib/api";
import { listFriendRequests } from "@/modules/users/services/lists";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listFriendRequests(user.id));
  } catch (error) {
    return fail(error);
  }
}
