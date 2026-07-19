import type { Role } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { OFFICIAL_HANDLE } from "@/modules/platform/reserved-handles";
import { followUser } from "@/modules/users/services/social";

export const OFFICIAL_USER_ID = "official-relune-platform";
/** Sentinel email — never used for login; credentials/OAuth/phone are blocked. */
export const OFFICIAL_EMAIL = "official@relune.app";
export const OFFICIAL_BIO =
  "Welcome to Relune — Official account for news, updates, new features, creators, and announcements.";

let cachedOfficialId: string | null = null;

export async function getOfficialUserId() {
  if (cachedOfficialId) return cachedOfficialId;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: OFFICIAL_USER_ID },
        { handle: OFFICIAL_HANDLE, isOfficial: true },
      ],
    },
    select: { id: true },
  });
  if (user) cachedOfficialId = user.id;
  return user?.id ?? null;
}

export function isOfficialUser(user: {
  id?: string;
  handle?: string | null;
  isOfficial?: boolean;
  email?: string | null;
}) {
  return Boolean(
    user.isOfficial ||
      user.id === OFFICIAL_USER_ID ||
      user.handle?.toLowerCase() === OFFICIAL_HANDLE ||
      user.email?.toLowerCase() === OFFICIAL_EMAIL,
  );
}

/** Only the platform owner (SUPER_ADMIN) may manage the official account. */
export function assertCanManageOfficialAccount(
  actorRole: Role,
  target: { isOfficial?: boolean },
) {
  if (!target.isOfficial) return;
  if (actorRole !== "SUPER_ADMIN") {
    throw new AppError(
      "Only the Super Admin can manage the official RELUNE account.",
      403,
    );
  }
}

export function assertIsSuperAdmin(role: string | undefined | null) {
  if (role !== "SUPER_ADMIN") {
    throw new AppError(
      "Only the Super Admin can open the official RELUNE account.",
      403,
    );
  }
}

export function assertOfficialAccountProtected(target: {
  isOfficial?: boolean;
  id?: string;
  handle?: string | null;
  email?: string | null;
}) {
  if (isOfficialUser(target)) {
    throw new AppError(
      "The official RELUNE platform account cannot be modified or removed.",
      403,
    );
  }
}

/** Official Relune follows every new member */
export async function officialFollowNewUser(newUserId: string) {
  const officialId = await getOfficialUserId();
  if (!officialId || officialId === newUserId) return;
  try {
    await followUser(officialId, newUserId);
  } catch {
    /* already following or blocked — ignore */
  }
}
