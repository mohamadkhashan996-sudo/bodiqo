import { z } from "zod";
import bcrypt from "bcryptjs";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  confirmPendingOAuthLink,
  getPendingOAuthLink,
} from "@/modules/auth/account-link";
import { PROVIDER_SHORT, type OAuthProviderId } from "@/modules/auth/providers";
import { writeAudit } from "@/modules/admin/services/audit";

export async function GET() {
  try {
    const user = await requireUser();
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        type: true,
      },
      orderBy: { provider: "asc" },
    });
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, email: true, emailVerified: true },
    });
    return ok({
      accounts: accounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        label: PROVIDER_SHORT[a.provider as OAuthProviderId] || a.provider,
        providerAccountId: a.providerAccountId,
      })),
      hasPassword: Boolean(me?.passwordHash),
      email: me?.email,
      emailVerified: Boolean(me?.emailVerified),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(request: Request) {
  try {
    await guardApiAbuse(request, "auth:unlink", 20);
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    if (!provider) throw new AppError("Provider required", 400);

    const accounts = await prisma.account.findMany({ where: { userId: user.id } });
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (accounts.length <= 1 && !me?.passwordHash) {
      throw new AppError(
        "Add a password or another login method before disconnecting this one.",
        400,
      );
    }

    await prisma.account.deleteMany({
      where: { userId: user.id, provider },
    });
    await writeAudit({
      actorId: user.id,
      action: "auth.provider.unlink",
      meta: { provider },
    });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

/** Confirm pending OAuth link after password verification or authenticated session. */
export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "auth:link", 15);
    const data = await body(
      request,
      z.object({
        token: z.string().min(10),
        password: z.string().min(8).max(128).optional(),
      }),
    );

    const pending = await getPendingOAuthLink(data.token);
    if (!pending) throw new AppError("This link is invalid or expired", 400);

    const user = await prisma.user.findUnique({
      where: { id: pending.row.userId },
    });
    if (!user) throw new AppError("Unable to verify account", 400);

    if (user.passwordHash) {
      if (!data.password) throw new AppError("Password required", 400);
      const match = await bcrypt.compare(data.password, user.passwordHash);
      if (!match) throw new AppError("Incorrect password", 401);
    } else {
      // OAuth-only: require an already-authenticated session for this user.
      const sessionUser = await requireUser();
      if (sessionUser.id !== user.id) {
        throw new AppError(
          "Sign in with your existing Relune login, then confirm this link.",
          401,
        );
      }
    }

    const linked = await confirmPendingOAuthLink(data.token, user.id);
    await writeAudit({
      actorId: user.id,
      action: "auth.provider.link",
      meta: { provider: linked.provider },
    });

    return ok({
      ok: true,
      provider: linked.provider,
      email: user.email,
      hasPassword: Boolean(user.passwordHash),
    });
  } catch (e) {
    return fail(e);
  }
}
