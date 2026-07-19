import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createAuthChallenge } from "@/modules/auth/challenges";
import { writeAudit } from "@/modules/admin/services/audit";
import {
  assertIsSuperAdmin,
  getOfficialUserId,
  OFFICIAL_USER_ID,
} from "@/modules/platform/official-account";

export const OFFICIAL_IMPERSONATE_PURPOSE = "OFFICIAL_IMPERSONATE";
export const OFFICIAL_RETURN_PURPOSE = "OFFICIAL_RETURN";

function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export async function openOfficialAccountSession(
  actor: { id: string; role: string },
  request: Request,
) {
  assertIsSuperAdmin(actor.role);

  const officialId = await getOfficialUserId();
  if (!officialId) {
    throw new AppError(
      "Official Relune account is not provisioned. Run db:seed:official.",
      404,
    );
  }

  const official = await prisma.user.findUnique({
    where: { id: officialId },
    select: {
      id: true,
      status: true,
      isOfficial: true,
      handle: true,
      passwordHash: true,
    },
  });
  if (!official?.isOfficial || official.status !== "ACTIVE") {
    throw new AppError("Official Relune account is unavailable", 403);
  }

  // Ensure the account stays passwordless / non-login.
  if (official.passwordHash) {
    await prisma.user.update({
      where: { id: official.id },
      data: { passwordHash: null, phone: null },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { id: true, sessionVersion: true, role: true },
  });

  const token = await createAuthChallenge(
    official.id,
    OFFICIAL_IMPERSONATE_PURPOSE,
    {
      impersonatorId: admin.id,
      impersonatorSessionVersion: admin.sessionVersion,
      impersonatorRole: admin.role,
    },
    5,
  );

  await writeAudit({
    actorId: admin.id,
    action: "admin.official.session.open",
    target: official.id,
    meta: { handle: official.handle ?? "relune" },
    ip: requestIp(request),
  });

  return {
    token,
    purpose: OFFICIAL_IMPERSONATE_PURPOSE,
    officialUserId: official.id,
    redirectTo: "/u/relune",
  };
}

export async function returnFromOfficialAccountSession(
  session: {
    id: string;
    impersonatorId?: string | null;
  },
  request: Request,
) {
  const impersonatorId = session.impersonatorId;
  if (!impersonatorId) {
    throw new AppError("You are not managing the official account", 400);
  }

  if (
    session.id !== OFFICIAL_USER_ID &&
    session.id !== (await getOfficialUserId())
  ) {
    throw new AppError("Not in an official account session", 400);
  }

  const admin = await prisma.user.findUnique({
    where: { id: impersonatorId },
    select: { id: true, role: true, status: true, sessionVersion: true },
  });
  if (!admin || admin.role !== "SUPER_ADMIN" || admin.status !== "ACTIVE") {
    throw new AppError("Super Admin session cannot be restored", 403);
  }

  const token = await createAuthChallenge(
    admin.id,
    OFFICIAL_RETURN_PURPOSE,
    {
      fromOfficialId: session.id,
      restoredSessionVersion: admin.sessionVersion,
    },
    5,
  );

  await writeAudit({
    actorId: admin.id,
    action: "admin.official.session.return",
    target: session.id,
    ip: requestIp(request),
  });

  return {
    token,
    purpose: OFFICIAL_RETURN_PURPOSE,
    redirectTo: "/admin",
  };
}
