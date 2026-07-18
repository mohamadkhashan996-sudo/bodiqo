import type { Role } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { OFFICIAL_HANDLE } from "@/modules/platform/reserved-handles";
import { followUser } from "@/modules/users/services/social";

export const OFFICIAL_USER_ID = "official-relune-platform";
export const OFFICIAL_EMAIL = "official@relune.app";

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
}) {
  return Boolean(
    user.isOfficial ||
    user.id === OFFICIAL_USER_ID ||
    user.handle?.toLowerCase() === OFFICIAL_HANDLE,
  );
}

export function assertCanManageOfficialAccount(
  actorRole: Role,
  target: { isOfficial?: boolean },
) {
  if (!target.isOfficial) return;
  if (actorRole !== "SUPER_ADMIN" && actorRole !== "OWNER") {
    throw new AppError(
      "Only the Super Admin can manage the official RELUNE account.",
      403,
    );
  }
}

export function assertOfficialAccountProtected(target: {
  isOfficial?: boolean;
}) {
  if (target.isOfficial) {
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
