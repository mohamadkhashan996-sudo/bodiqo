import { fail, ok, optionalUser } from "@/lib/api";
import { getSuggestedUsers } from "@/modules/users/services/suggestions";

export async function GET(request: Request) {
  try {
    const user = await optionalUser();
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 8);
    return ok({ users: await getSuggestedUsers(limit, user?.id) });
  } catch (error) {
    return fail(error);
  }
}
