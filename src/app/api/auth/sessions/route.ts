import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { bumpSessionVersion } from "@/modules/auth/security";

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
    const data = await body(
      r,
      z.object({
        id: z.string().optional(),
        all: z.boolean().optional(),
      }),
    );
    if (data.all) {
      await prisma.deviceSession.updateMany({
        where: { userId: u.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await bumpSessionVersion(u.id);
      return ok({ ok: true, all: true });
    }
    if (!data.id) throw new AppError("Session id required", 400);
    await prisma.deviceSession.updateMany({
      where: { id: data.id, userId: u.id },
      data: { revokedAt: new Date() },
    });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
