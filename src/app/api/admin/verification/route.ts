import { z } from "zod";
import { VerificationRequestStatus } from "@prisma/client";
import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import {
  listVerificationRequests,
  reviewVerification,
} from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:verification");
    await requireStaff("verification:read");
    const { searchParams } = new URL(request.url);
    const requests = await listVerificationRequests({
      status:
        (searchParams.get("status") as VerificationRequestStatus) || undefined,
      take: Number(searchParams.get("take") ?? 40),
    });
    return ok({ requests });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:verification:write", 30);
    const staff = await requireStaff("verification:write");
    const data = await body(
      request,
      z.object({
        requestId: z.string().min(1),
        action: z.enum(["approve", "reject", "needs_info"]),
        adminNote: z.string().max(1000).optional(),
      }),
    );
    return ok(
      await reviewVerification(
        staff.id,
        data.requestId,
        data.action,
        data.adminNote,
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
