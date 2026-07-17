import { fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { getModerationSummary } from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:moderation");
    await requireStaff("reports:read");
    return ok(await getModerationSummary());
  } catch (e) {
    return fail(e);
  }
}
