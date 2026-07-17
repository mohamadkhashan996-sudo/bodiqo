import { fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { listBlocked } from "@/modules/users/services/lists";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "social:blocked:get", 60, 60000);
    const user = await requireUser();
    return ok(await listBlocked(user.id));
  } catch (error) {
    return fail(error);
  }
}
