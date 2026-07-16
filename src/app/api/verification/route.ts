import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createVerificationRequest } from "@/modules/admin/services";

export async function GET() {
  try {
    const user = await requireUser();
    const mine = await prisma.verificationRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return ok({ requests: mine });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "verification:request", 5, 60_000);
    const user = await requireUser();
    const data = await body(
      request,
      z.object({
        fullName: z.string().min(2).max(120),
        category: z.string().min(2).max(80),
        evidenceUrls: z.array(z.string().url()).max(8).optional(),
        notes: z.string().max(1000).optional(),
      }),
    );
    return ok(await createVerificationRequest(user.id, data), 201);
  } catch (e) {
    return fail(e);
  }
}
