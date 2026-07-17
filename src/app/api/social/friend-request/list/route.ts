import { fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { listFriendRequests } from "@/modules/users/services/lists";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "social:friend-request:list:get", 60, 60000);
    const user = await requireUser();
    return ok(await listFriendRequests(user.id));
  } catch (error) {
    return fail(error);
  }
}
