import { fail, ok, requireUser, guardApiAbuse } from "@/lib/api";
import { listMuted } from "@/modules/users/services/lists";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "social:muted:get", 60, 60000);
    const user = await requireUser();
    return ok(await listMuted(user.id));
  } catch (error) {
    return fail(error);
  }
}
