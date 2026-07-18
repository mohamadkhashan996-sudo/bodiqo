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
 * Fast path for middleware: reject JWTs whose sessionVersion is behind Redis,
 * or whose device session was revoked. Falls back to Prisma when Redis is down
 * (non-production may allow JWT-only).
 */
export async function isJwtSessionActive(token: {
  sub?: string | null;
  sessionVersion?: unknown;
  sessionKey?: unknown;
}): Promise<boolean> {
  if (!token.sub) return false;

  const redis = await getRedis();
  if (redis) {
    try {
      if (typeof token.sessionKey === "string") {
        const revoked = await redis.get(deviceRevokeKey(token.sessionKey));
        if (revoked) return false;
      }
      const published = await redis.get(svKey(token.sub));
      if (published != null) {
        const tokenSv =
          typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
        if (Number(published) !== tokenSv) return false;
      }
      return true;
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
    (typeof token.sessionVersion === "number" &&
      dbUser.sessionVersion !== token.sessionVersion)
  ) {
    return false;
  }

  if (typeof token.sessionKey === "string") {
    const device = await prisma.deviceSession.findUnique({
      where: { sessionKey: token.sessionKey },
      select: { revokedAt: true },
    });
    if (!device || device.revokedAt) return false;
  }

  return true;
}
