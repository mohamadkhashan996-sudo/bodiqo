import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const u = await requireUser();
    return ok({
      devices: await prisma.trustedDevice.findMany({
        where: { userId: u.id },
        orderBy: { lastSeenAt: "desc" },
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
    await prisma.trustedDevice.deleteMany({ where: { id, userId: u.id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
