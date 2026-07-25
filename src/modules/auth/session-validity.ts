import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

const SV_TTL_SEC = 60 * 60 * 24 * 45; // cover max session lifetime
const DEVICE_REVOKE_TTL_SEC = SV_TTL_SEC;

function svKey(userId: string) {
  return `auth:sv:${userId}`;
}

function deviceRevokeKey(sessionKey: string) {
  return `auth:ds:revoked:${sessionKey}`;
}

/** Publish the current sessionVersion so Edge/Node middleware can reject stale JWTs. */
export async function publishSessionVersion(
  userId: string,
  version?: number,
) {
  const redis = await getRedis();
  if (!redis) return;
  let v = version;
  if (v == null) {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true },
    });
    v = row?.sessionVersion ?? 0;
  }
  try {
    await redis.set(svKey(userId), String(v), { EX: SV_TTL_SEC });
  } catch {
    /* best-effort */
  }
}

export async function markDeviceSessionRevoked(sessionKey: string) {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(deviceRevokeKey(sessionKey), "1", {
      EX: DEVICE_REVOKE_TTL_SEC,
    });
  } catch {
    /* best-effort */
  }
}

export async function markDeviceSessionsRevoked(sessionKeys: string[]) {
  await Promise.all(
    sessionKeys.filter(Boolean).map((key) => markDeviceSessionRevoked(key)),
  );
}

/**
 * Fast path for middleware: Redis early-rejects revoked devices / stale
 * sessionVersion. Account status and missing SV always go through Prisma.
 */
export async function isJwtSessionActive(token: {
  sub?: string | null;
  sessionVersion?: unknown;
  sessionKey?: unknown;
  impersonatorId?: unknown;
  impersonatorSessionVersion?: unknown;
}): Promise<boolean> {
  if (!token.sub) return false;
  if (typeof token.sessionVersion !== "number") return false;
  if (typeof token.sessionKey !== "string" || !token.sessionKey) return false;

  const redis = await getRedis();
  if (redis) {
    try {
      const revoked = await redis.get(deviceRevokeKey(token.sessionKey));
      if (revoked) return false;
      const published = await redis.get(svKey(token.sub));
      if (published != null) {
        if (Number(published) !== token.sessionVersion) return false;
      }
      // Redis can early-reject; account status still needs Prisma.
    } catch {
      /* fall through to Prisma */
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: token.sub },
    select: { sessionVersion: true, status: true },
  });
  if (
    !dbUser ||
    dbUser.status === "BANNED" ||
    dbUser.status === "DELETED" ||
    dbUser.status === "SUSPENDED" ||
    dbUser.sessionVersion !== token.sessionVersion
  ) {
    return false;
  }

  const device = await prisma.deviceSession.findUnique({
    where: { sessionKey: token.sessionKey },
    select: { revokedAt: true, userId: true },
  });
  if (!device || device.revokedAt || device.userId !== token.sub) return false;

  if (typeof token.impersonatorId === "string") {
    if (typeof token.impersonatorSessionVersion !== "number") return false;
    const impersonator = await prisma.user.findUnique({
      where: { id: token.impersonatorId },
      select: { role: true, status: true, sessionVersion: true },
    });
    if (
      !impersonator ||
      impersonator.role !== "SUPER_ADMIN" ||
      impersonator.status !== "ACTIVE" ||
      impersonator.sessionVersion !== token.impersonatorSessionVersion
    ) {
      return false;
    }
  }

  return true;
}
