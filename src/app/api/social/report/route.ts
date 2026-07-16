import { ReportTarget } from "@prisma/client";
import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { reportEntity } from "@/modules/users/services/social";
export async function POST(r: Request) {
  try {
    await guardApiAbuse(r, "social:report", 20);
    const u = await requireUser();
    const d = await body(
      r,
      z.object({
        targetType: z.nativeEnum(ReportTarget),
        targetId: z.string(),
        reason: z.string().min(2).max(200),
        details: z.string().max(2000).optional(),
      }),
    );
    return ok(
      {
        report: await reportEntity(
          u.id,
          d.targetType,
          d.targetId,
          d.reason,
          d.details,
        ),
      },
      201,
    );
  } catch (e) {
    return fail(e);
  }
}
