import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const u = await requireUser();
    return ok({
      sessions: await prisma.deviceSession.findMany({
        where: { userId: u.id, revokedAt: null },
        orderBy: { lastActiveAt: "desc" },
      }),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(r: Request) {
  try {
    const u = await requireUser();
    const { id } = await body(r, z.object({ id: z.string() }));
    await prisma.deviceSession.updateMany({
      where: { id, userId: u.id },
      data: { revokedAt: new Date() },
    });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
