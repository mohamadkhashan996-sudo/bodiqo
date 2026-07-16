import { fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { getDashboardOverview } from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:overview", 30);
    await requireStaff("admin:access");
    return ok(await getDashboardOverview());
  } catch (e) {
    return fail(e);
  }
}
