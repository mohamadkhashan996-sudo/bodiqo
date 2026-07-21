import { fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { getAuthAdminStats } from "@/modules/admin/services/auth-stats";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:auth");
    await requireStaff("settings:read");
    return ok(await getAuthAdminStats());
  } catch (e) {
    return fail(e);
  }
}
