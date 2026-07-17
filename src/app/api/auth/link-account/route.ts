import { fail, ok, guardApiAbuse } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getPendingOAuthLink } from "@/modules/auth/account-link";
import { PROVIDER_SHORT, type OAuthProviderId } from "@/modules/auth/providers";

/** Public preview of a pending OAuth account link (no secrets). */
export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "auth:link-account:get", 20, 60000);
    const token = new URL(request.url).searchParams.get("token");
    if (!token) throw new AppError("Missing link token", 400);
    const pending = await getPendingOAuthLink(token);
    if (!pending) throw new AppError("This link is invalid or expired", 400);
    const user = await prisma.user.findUnique({
      where: { id: pending.row.userId },
      select: { passwordHash: true },
    });
    return ok({
      email: pending.data.email,
      provider: pending.data.provider,
      label:
        PROVIDER_SHORT[pending.data.provider as OAuthProviderId] ||
        pending.data.provider,
      expiresAt: pending.row.expiresAt,
      hasPassword: Boolean(user?.passwordHash),
    });
  } catch (e) {
    return fail(e);
  }
}
