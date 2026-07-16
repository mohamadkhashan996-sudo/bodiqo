import { fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { listAuditLogs } from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:audit");
    await requireStaff("monitoring:read");
    const { searchParams } = new URL(request.url);
    return ok({
      logs: await listAuditLogs({
        take: Number(searchParams.get("take") ?? 50),
        action: searchParams.get("action") ?? undefined,
        cursor: searchParams.get("cursor") ?? undefined,
      }),
    });
  } catch (e) {
    return fail(e);
  }
}
