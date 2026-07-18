import type { Prisma, SupportTicketStatus } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/modules/notifications/services/notify";

import { writeAudit } from "./audit";

export async function listSupportTickets(opts: {
  status?: SupportTicketStatus;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(opts.take ?? 40, 100);
  return prisma.supportTicket.findMany({
    where: opts.status ? { status: opts.status } : undefined,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take,
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
    include: {
      user: {
        select: { id: true, handle: true, displayName: true, email: true },
      },
      assignee: {
        select: { id: true, handle: true, displayName: true },
      },
    },
  });
}

export async function createSupportTicket(
  actorId: string | null,
  input: {
    userId?: string | null;
    email?: string | null;
    subject: string;
    body: string;
    priority?: number;
  },
) {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length < 3) throw new AppError("Subject too short", 400);
  if (body.length < 3) throw new AppError("Body too short", 400);

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: input.userId || null,
      email: input.email?.trim() || null,
      subject: subject.slice(0, 200),
      body: body.slice(0, 5000),
      priority: Math.min(Math.max(input.priority ?? 0, 0), 5),
    },
  });
  if (actorId) {
    await writeAudit({
      actorId,
      action: "admin.support.create",
      target: ticket.id,
    });
  }
  return ticket;
}

export async function updateSupportTicket(
  actorId: string,
  ticketId: string,
  data: {
    status?: SupportTicketStatus;
    priority?: number;
    assigneeId?: string | null;
    resolution?: string | null;
  },
) {
  const existing = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });
  if (!existing) throw new AppError("Ticket not found", 404);

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: data.status,
      priority:
        data.priority === undefined
          ? undefined
          : Math.min(Math.max(data.priority, 0), 5),
      assigneeId: data.assigneeId === undefined ? undefined : data.assigneeId,
      resolution: data.resolution === undefined ? undefined : data.resolution,
      resolvedAt:
        data.status === "RESOLVED" || data.status === "CLOSED"
          ? new Date()
          : data.status
            ? null
            : undefined,
    },
  });
  await writeAudit({
    actorId,
    action: "admin.support.update",
    target: ticketId,
    meta: data as Prisma.InputJsonValue,
  });
  return updated;
}

export async function listAnnouncements(take = 40) {
  return prisma.platformAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 100),
    include: {
      createdBy: {
        select: { id: true, handle: true, displayName: true },
      },
    },
  });
}

export async function createAnnouncement(
  actorId: string,
  input: { title: string; body: string; href?: string | null },
) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 2) throw new AppError("Title too short", 400);
  if (body.length < 2) throw new AppError("Body too short", 400);

  const row = await prisma.platformAnnouncement.create({
    data: {
      title: title.slice(0, 160),
      body: body.slice(0, 4000),
      href: input.href?.trim() || null,
      createdById: actorId,
    },
  });
  await writeAudit({
    actorId,
    action: "admin.announcement.create",
    target: row.id,
  });
  return row;
}

export async function publishAnnouncement(
  actorId: string,
  id: string,
  publish: boolean,
) {
  const existing = await prisma.platformAnnouncement.findUnique({
    where: { id },
  });
  if (!existing) throw new AppError("Announcement not found", 404);

  const updated = await prisma.platformAnnouncement.update({
    where: { id },
    data: {
      published: publish,
      publishedAt: publish ? new Date() : null,
    },
  });

  if (publish) {
    const recipients = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
      take: 500,
      orderBy: { lastSeenAt: "desc" },
    });
    await Promise.all(
      recipients.map((u) =>
        createNotification({
          userId: u.id,
          actorId,
          type: "ANNOUNCEMENT",
          body: existing.title,
          href: existing.href || "/notifications",
        }).catch(() => undefined),
      ),
    );
  }

  await writeAudit({
    actorId,
    action: publish
      ? "admin.announcement.publish"
      : "admin.announcement.unpublish",
    target: id,
  });
  return updated;
}

export async function deleteAnnouncement(actorId: string, id: string) {
  await prisma.platformAnnouncement.delete({ where: { id } }).catch(() => {
    throw new AppError("Announcement not found", 404);
  });
  await writeAudit({
    actorId,
    action: "admin.announcement.delete",
    target: id,
  });
  return { ok: true };
}
