import type { ReportTarget } from "@prisma/client";
import { ReportCategory, ReportStatus } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import {
  listReports,
  resolveReportWithAction,
  updateReport,
} from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:reports");
    await requireStaff("reports:read");
    const { searchParams } = new URL(request.url);
    const reports = await listReports({
      status: (searchParams.get("status") as ReportStatus) || undefined,
      category: (searchParams.get("category") as ReportCategory) || undefined,
      targetType: (searchParams.get("targetType") as ReportTarget) || undefined,
      take: Number(searchParams.get("take") ?? 40),
      cursor: searchParams.get("cursor") ?? undefined,
    });
    return ok({ reports });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "admin:reports:write", 40);
    const staff = await requireStaff("reports:write");
    const data = await body(
      request,
      z.object({
        reportId: z.string().min(1),
        status: z.nativeEnum(ReportStatus).optional(),
        category: z.nativeEnum(ReportCategory).optional(),
        resolution: z.string().max(1000).optional(),
        assigneeId: z.string().nullable().optional(),
        action: z
          .enum(["delete_post", "delete_comment", "ban_user", "none"])
          .optional(),
      }),
    );
    const { reportId, action, ...patch } = data;
    if (action) {
      return ok(
        await resolveReportWithAction(staff.id, staff.role, reportId, action),
      );
    }
    return ok(await updateReport(staff.id, reportId, patch));
  } catch (e) {
    return fail(e);
  }
}
