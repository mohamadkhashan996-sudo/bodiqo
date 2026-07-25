import { type AccountStatus, Role } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { AppError } from "@/lib/errors";
import {
  addUserNote,
  banUser,
  getUserAdmin,
  listUsers,
  logoutAllDevices,
  resetUser2FA,
  resetUserPassword,
  setVerified,
  softDeleteUser,
  suspendUser,
  unbanUser,
  updateUserAdmin,
  warnUser,
} from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:users");
    await requireStaff("users:read");
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const statuses = statusParam
      ? (statusParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) as AccountStatus[])
      : undefined;
    const users = await listUsers({
      q: searchParams.get("q") ?? undefined,
      status:
        statuses && statuses.length > 1 ? statuses : statuses?.[0] || undefined,
      role: (searchParams.get("role") as Role) || undefined,
      verified:
        searchParams.get("verified") === null
          ? undefined
          : searchParams.get("verified") === "true",
      take: Number(searchParams.get("take") ?? 40),
      cursor: searchParams.get("cursor") ?? undefined,
    });
    return ok({ users });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "admin:users:write", 40);
    const staff = await requireStaff("users:write");
    const data = await body(
      request,
      z.object({
        userId: z.string().min(1),
        displayName: z.string().min(1).max(80).optional(),
        handle: z.string().min(2).max(32).optional(),
        bio: z.string().max(500).optional(),
        role: z.nativeEnum(Role).optional(),
        isVerified: z.boolean().optional(),
        trustScore: z.number().int().min(0).max(100).optional(),
        locale: z.string().max(12).optional(),
      }),
    );
    const { userId, ...patch } = data;
    if (patch.role) {
      await requireStaff("roles:write");
    }
    return ok(await updateUserAdmin(staff.id, staff.role, userId, patch));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:users:action", 40);
    const data = await body(
      request,
      z.object({
        userId: z.string().min(1),
        action: z.enum([
          "suspend",
          "ban",
          "unban",
          "delete",
          "reset_password",
          "reset_2fa",
          "verify",
          "unverify",
          "note",
          "warn",
          "logout_all",
          "get",
        ]),
        reason: z.string().max(500).optional(),
        permanent: z.boolean().optional(),
        until: z.string().optional(),
        password: z.string().min(8).max(128).optional(),
        body: z.string().min(1).max(2000).optional(),
      }),
    );

    if (data.action === "get") {
      await requireStaff("users:read");
      return ok(await getUserAdmin(data.userId));
    }

    if (data.action === "note") {
      const staff = await requireStaff("users:write");
      if (!data.body) throw new AppError("body required", 400);
      return ok(await addUserNote(staff.id, data.userId, data.body), 201);
    }

    if (data.action === "warn") {
      const staff = await requireStaff("users:ban");
      return ok(
        await warnUser(
          staff.id,
          staff.role,
          data.userId,
          data.reason ?? "Warning",
        ),
        201,
      );
    }

    if (data.action === "suspend") {
      const staff = await requireStaff("users:ban");
      return ok(
        await suspendUser(staff.id, staff.role, data.userId, data.reason),
      );
    }

    if (data.action === "ban") {
      const staff = await requireStaff("users:ban");
      return ok(
        await banUser(staff.id, staff.role, data.userId, {
          permanent: data.permanent,
          until: data.until,
          reason: data.reason,
        }),
      );
    }

    if (data.action === "unban") {
      const staff = await requireStaff("users:ban");
      return ok(await unbanUser(staff.id, staff.role, data.userId));
    }

    if (data.action === "delete") {
      const staff = await requireStaff("users:delete");
      return ok(await softDeleteUser(staff.id, staff.role, data.userId));
    }

    if (data.action === "reset_password") {
      const staff = await requireStaff("users:write");
      if (!data.password) throw new AppError("password required", 400);
      return ok(
        await resetUserPassword(
          staff.id,
          staff.role,
          data.userId,
          data.password,
        ),
      );
    }

    if (data.action === "reset_2fa") {
      const staff = await requireStaff("users:write");
      return ok(await resetUser2FA(staff.id, staff.role, data.userId));
    }

    if (data.action === "verify" || data.action === "unverify") {
      const staff = await requireStaff("users:write");
      return ok(
        await setVerified(
          staff.id,
          staff.role,
          data.userId,
          data.action === "verify",
        ),
      );
    }

    if (data.action === "logout_all") {
      const staff = await requireStaff("users:write");
      return ok(await logoutAllDevices(staff.id, staff.role, data.userId));
    }

    throw new AppError("Unknown action", 400);
  } catch (e) {
    return fail(e);
  }
}
