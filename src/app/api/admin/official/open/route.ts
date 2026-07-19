import { fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { openOfficialAccountSession } from "@/modules/admin/services/official-session";

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:official:open", 10);
    const user = await requireStaff("admin:access");
    return ok(await openOfficialAccountSession(user, request));
  } catch (e) {
    return fail(e);
  }
}
