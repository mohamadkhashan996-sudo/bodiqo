import { fail, ok, requireUser } from "@/lib/api";
import { listMuted } from "@/modules/users/services/lists";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listMuted(user.id));
  } catch (error) {
    return fail(error);
  }
}
