import { fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { getAnalytics } from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:analytics");
    await requireStaff("analytics:read");
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
    return ok(await getAnalytics(Math.min(Math.max(days, 7), 90)));
  } catch (e) {
    return fail(e);
  }
}
