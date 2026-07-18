import type { Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  target?: string;
  meta?: Prisma.InputJsonValue;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        target: input.target,
        meta: input.meta ?? undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (error) {
    logger.error("audit_write_failed", {
      error: String(error),
      action: input.action,
    });
  }
}

export async function writeSecurityEvent(input: {
  type: string;
  severity?: string;
  actorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.securityEvent.create({
      data: {
        type: input.type,
        severity: input.severity ?? "info",
        actorId: input.actorId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (error) {
    logger.error("security_event_failed", {
      error: String(error),
      type: input.type,
    });
  }
}

export async function listAuditLogs(opts: {
  take?: number;
  cursor?: string;
  action?: string;
}) {
  const take = Math.min(opts.take ?? 50, 100);
  return prisma.auditLog.findMany({
    where: opts.action ? { action: opts.action } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
  });
}

export async function listSecurityEvents(opts: {
  take?: number;
  severity?: string;
}) {
  return prisma.securityEvent.findMany({
    where: opts.severity ? { severity: opts.severity } : undefined,
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.take ?? 50, 100),
  });
}
