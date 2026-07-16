import {
  AccountStatus,
  Prisma,
  Role,
  type User,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { cacheDelPrefix } from "@/lib/cache";
import { ROLE_RANK } from "@/lib/permissions";
import { writeAudit } from "./audit";

const userSelect = {
  id: true,
  email: true,
  name: true,
  displayName: true,
  handle: true,
  image: true,
  role: true,
  status: true,
  isVerified: true,
  trustScore: true,
  warningCount: true,
  bannedUntil: true,
  banReason: true,
  twoFactorEnabled: true,
  country: true,
  city: true,
  locale: true,
  presence: true,
  lastSeenAt: true,
  followersCount: true,
  followingCount: true,
  postsCount: true,
  createdAt: true,
  updatedAt: true,
  emailVerified: true,
} satisfies Prisma.UserSelect;

export async function listUsers(opts: {
  q?: string;
  status?: AccountStatus;
  role?: Role;
  verified?: boolean;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(opts.take ?? 40, 100);
  const where: Prisma.UserWhereInput = {
    status: opts.status ?? { not: "DELETED" },
  };
  if (opts.role) where.role = opts.role;
  if (opts.verified !== undefined) where.isVerified = opts.verified;
  if (opts.q) {
    where.OR = [
      { email: { contains: opts.q } },
      { handle: { contains: opts.q } },
      { displayName: { contains: opts.q } },
      { name: { contains: opts.q } },
    ];
  }
  return prisma.user.findMany({
    where,
    select: userSelect,
    orderBy: { createdAt: "desc" },
    take,
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
  });
}

export async function getUserAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSelect,
      bio: true,
      website: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);

  const [notes, warnings, loginHistory, devices, verificationRequests] =
    await Promise.all([
      prisma.userNote.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: { select: { id: true, handle: true, displayName: true } },
        },
      }),
      prisma.userWarning.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          issuer: { select: { id: true, handle: true, displayName: true } },
        },
      }),
      prisma.loginHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.deviceSession.findMany({
        where: { userId },
        orderBy: { lastActiveAt: "desc" },
        take: 40,
      }),
      prisma.verificationRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  return { user, notes, warnings, loginHistory, devices, verificationRequests };
}

function assertCanManage(actorRole: Role, target: Pick<User, "role" | "id">, actorId: string) {
  if (target.id === actorId) throw new AppError("Cannot perform this on yourself", 400);
  if (ROLE_RANK[actorRole] <= ROLE_RANK[target.role]) {
    throw new AppError("Insufficient privilege for this user", 403);
  }
}

export async function updateUserAdmin(
  actorId: string,
  actorRole: Role,
  userId: string,
  data: {
    displayName?: string;
    handle?: string;
    bio?: string;
    role?: Role;
    status?: AccountStatus;
    isVerified?: boolean;
    trustScore?: number;
    locale?: string;
  },
) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);

  if (data.role && ROLE_RANK[actorRole] <= ROLE_RANK[data.role]) {
    throw new AppError("Cannot assign equal or higher role", 403);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: data.displayName,
      handle: data.handle,
      bio: data.bio,
      role: data.role,
      status: data.status,
      isVerified: data.isVerified,
      trustScore: data.trustScore,
      locale: data.locale,
    },
    select: userSelect,
  });
  await writeAudit({
    actorId,
    action: "admin.user.update",
    target: userId,
    meta: data,
  });
  await cacheDelPrefix("admin:");
  return updated;
}

export async function suspendUser(
  actorId: string,
  actorRole: Role,
  userId: string,
  reason?: string,
) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: "SUSPENDED", banReason: reason ?? "Suspended by staff" },
    select: userSelect,
  });
  await writeAudit({
    actorId,
    action: "admin.user.suspend",
    target: userId,
    meta: { reason },
  });
  await cacheDelPrefix("admin:");
  return updated;
}

export async function banUser(
  actorId: string,
  actorRole: Role,
  userId: string,
  opts: { permanent?: boolean; until?: string; reason?: string },
) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);

  const bannedUntil = opts.permanent
    ? null
    : opts.until
      ? new Date(opts.until)
      : new Date(Date.now() + 7 * 24 * 60 * 60_000);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      status: "BANNED",
      bannedUntil: opts.permanent ? new Date("9999-12-31") : bannedUntil,
      banReason: opts.reason ?? "Banned by staff",
    },
    select: userSelect,
  });
  await writeAudit({
    actorId,
    action: opts.permanent ? "admin.user.ban.permanent" : "admin.user.ban.temporary",
    target: userId,
    meta: opts,
  });
  await cacheDelPrefix("admin:");
  return updated;
}

export async function unbanUser(actorId: string, actorRole: Role, userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      status: "ACTIVE",
      bannedUntil: null,
      banReason: null,
    },
    select: userSelect,
  });
  await writeAudit({ actorId, action: "admin.user.unban", target: userId });
  await cacheDelPrefix("admin:");
  return updated;
}

export async function softDeleteUser(actorId: string, actorRole: Role, userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      status: "DELETED",
      email: `deleted+${userId}@cirqua.invalid`,
      handle: null,
    },
    select: userSelect,
  });
  await prisma.deviceSession.deleteMany({ where: { userId } });
  await writeAudit({ actorId, action: "admin.user.delete", target: userId });
  await cacheDelPrefix("admin:");
  return updated;
}

export async function resetUserPassword(
  actorId: string,
  actorRole: Role,
  userId: string,
  newPassword: string,
) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);
  if (newPassword.length < 8) throw new AppError("Password too short", 400);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.deviceSession.deleteMany({ where: { userId } });
  await writeAudit({ actorId, action: "admin.user.reset_password", target: userId });
  return { ok: true };
}

export async function resetUser2FA(actorId: string, actorRole: Role, userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  await writeAudit({ actorId, action: "admin.user.reset_2fa", target: userId });
  return { ok: true };
}

export async function setVerified(
  actorId: string,
  actorRole: Role,
  userId: string,
  verified: boolean,
) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isVerified: verified },
    select: userSelect,
  });
  await writeAudit({
    actorId,
    action: verified ? "admin.user.verify" : "admin.user.unverify",
    target: userId,
  });
  return updated;
}

export async function addUserNote(actorId: string, userId: string, body: string) {
  const note = await prisma.userNote.create({
    data: { userId, authorId: actorId, body },
  });
  await writeAudit({ actorId, action: "admin.user.note", target: userId });
  return note;
}

export async function warnUser(
  actorId: string,
  actorRole: Role,
  userId: string,
  reason: string,
) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);
  const [warning] = await prisma.$transaction([
    prisma.userWarning.create({
      data: { userId, issuerId: actorId, reason },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { warningCount: { increment: 1 }, trustScore: { decrement: 5 } },
    }),
  ]);
  await writeAudit({
    actorId,
    action: "admin.user.warn",
    target: userId,
    meta: { reason },
  });
  return warning;
}

export async function logoutAllDevices(actorId: string, actorRole: Role, userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  assertCanManage(actorRole, target, actorId);
  await prisma.deviceSession.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await writeAudit({ actorId, action: "admin.user.logout_all", target: userId });
  return { ok: true };
}
