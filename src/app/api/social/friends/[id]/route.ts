import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  addCloseFriend,
  removeCloseFriend,
  removeFriend,
} from "@/modules/users/services/friends";

async function resolveUserId(raw: string) {
  if (raw.includes("@") || raw.length < 20) {
    const user = await prisma.user.findFirst({
      where: { handle: raw.replace(/^@/, "").toLowerCase(), status: "ACTIVE" },
      select: { id: true },
    });
    if (!user) throw new AppError("User not found", 404);
    return user.id;
  }
  return raw;
}

/** Remove friendship (both follow edges). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "social:friends:id:delete", 30);
    const me = await requireUser();
    const friendId = await resolveUserId((await params).id);
    return ok(await removeFriend(me.id, friendId));
  } catch (error) {
    return fail(error);
  }
}

/** Add / remove best friend. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "social:friends:id:post", 40);
    const me = await requireUser();
    const friendId = await resolveUserId((await params).id);
    const input = await body(
      request,
      z.object({ action: z.enum(["best", "unbest"]).default("best") }),
    ).catch(() => ({ action: "best" as const }));
    if (input.action === "unbest") {
      return ok(await removeCloseFriend(me.id, friendId));
    }
    return ok({ closeFriend: await addCloseFriend(me.id, friendId) }, 201);
  } catch (error) {
    return fail(error);
  }
}
