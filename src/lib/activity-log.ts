import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivityInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  summary?: string | null;
  meta?: Prisma.InputJsonValue | null;
  ip?: string | null;
};

export async function logActivity(input: ActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: input.actorId || null,
        actorEmail: input.actorEmail || null,
        action: input.action,
        entity: input.entity || null,
        entityId: input.entityId || null,
        summary: input.summary || null,
        meta: input.meta ?? undefined,
        ip: input.ip || null,
      },
    });
  } catch (error) {
    console.error("activity log failed", error);
  }
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}
