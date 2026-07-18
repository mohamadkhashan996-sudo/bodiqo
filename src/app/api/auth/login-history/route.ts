import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "auth:login-history:get", 40, 60000);
    const u = await requireUser();
    return ok({
      history: await prisma.loginHistory.findMany({
        where: { userId: u.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  } catch (e) {
    return fail(e);
  }
}
