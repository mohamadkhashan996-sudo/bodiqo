import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { disconnectDeviceSockets } from "@/lib/socket";
import { auth } from "@/modules/auth/auth";
import { invalidateAllUserSessions } from "@/modules/auth/security";
import { markDeviceSessionsRevoked } from "@/modules/auth/session-validity";

export async function GET() {
  try {
    const u = await requireUser();
    const session = await auth();
    const currentId = session?.deviceSessionId;
    const sessions = await prisma.deviceSession.findMany({
      where: { userId: u.id, revokedAt: null },
      orderBy: { lastActiveAt: "desc" },
    });
    return ok({
      currentId: currentId ?? null,
      sessions: sessions.map((s) => ({
        ...s,
        current: currentId ? s.id === currentId : false,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(r: Request) {
  try {
    await guardApiAbuse(r, "auth:sessions:delete");
    const u = await requireUser();
    const session = await auth();
    const data = await body(
      r,
      z.object({
        id: z.string().optional(),
        all: z.boolean().optional(),
        others: z.boolean().optional(),
      }),
    );
    if (data.all) {
      await invalidateAllUserSessions(u.id);
      return ok({ ok: true, all: true });
    }
    if (data.others) {
      const currentId = session?.deviceSessionId;
      const others = await prisma.deviceSession.findMany({
        where: {
          userId: u.id,
          revokedAt: null,
          ...(currentId ? { id: { not: currentId } } : {}),
        },
        select: { sessionKey: true },
      });
      await prisma.deviceSession.updateMany({
        where: {
          userId: u.id,
          revokedAt: null,
          ...(currentId ? { id: { not: currentId } } : {}),
        },
        data: { revokedAt: new Date() },
      });
      await markDeviceSessionsRevoked(others.map((s) => s.sessionKey));
      disconnectDeviceSockets(others.map((s) => s.sessionKey));
      return ok({ ok: true, others: true });
    }
    if (!data.id) throw new AppError("Session id required", 400);
    if (session?.deviceSessionId && data.id === session.deviceSessionId) {
      throw new AppError("Use sign out to end the current session", 400);
    }
    const target = await prisma.deviceSession.findFirst({
      where: { id: data.id, userId: u.id },
      select: { sessionKey: true },
    });
    await prisma.deviceSession.updateMany({
      where: { id: data.id, userId: u.id },
      data: { revokedAt: new Date() },
    });
    if (target?.sessionKey) {
      await markDeviceSessionsRevoked([target.sessionKey]);
      disconnectDeviceSockets([target.sessionKey]);
    }
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
