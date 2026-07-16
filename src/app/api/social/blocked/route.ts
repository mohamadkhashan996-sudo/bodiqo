import { fail, ok, requireUser } from "@/lib/api";
import { listBlocked } from "@/modules/users/services/lists";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listBlocked(user.id));
  } catch (error) {
    return fail(error);
  }
}
