import { fail, guardApiAbuse, requireStaff } from "@/lib/api";
import {
  analyticsToCsv,
  getAnalytics,
} from "@/modules/admin/services/analytics";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:analytics:export");
    await requireStaff("analytics:read");
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
    const data = await getAnalytics(Math.min(Math.max(days, 7), 90));
    const csv = analyticsToCsv(data);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relune-analytics-${days}d.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
