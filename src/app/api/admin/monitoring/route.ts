import { fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import {
  getMonitoringSnapshot,
  listAuditLogs,
  listSecurityEvents,
} from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:monitoring");
    await requireStaff("monitoring:read");
    const { searchParams } = new URL(request.url);
    if (searchParams.get("logs") === "audit") {
      return ok({
        logs: await listAuditLogs({
          take: Number(searchParams.get("take") ?? 50),
          action: searchParams.get("action") ?? undefined,
        }),
      });
    }
    if (searchParams.get("logs") === "security") {
      return ok({
        logs: await listSecurityEvents({
          take: Number(searchParams.get("take") ?? 50),
          severity: searchParams.get("severity") ?? undefined,
        }),
      });
    }
    return ok(await getMonitoringSnapshot());
  } catch (e) {
    return fail(e);
  }
}
