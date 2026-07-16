import { fail, ok } from "@/lib/api";
import { peekAuthChallenge } from "@/modules/auth/challenges";
import { AppError } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) throw new AppError("Missing token", 400);
    for (const purpose of ["OAUTH_2FA", "PHONE_2FA"] as const) {
      const row = await peekAuthChallenge(token, purpose);
      if (row) {
        return ok({
          purpose,
          email: row.user.email,
          expiresAt: row.expiresAt,
        });
      }
    }
    throw new AppError("This challenge is invalid or expired", 400);
  } catch (e) {
    return fail(e);
  }
}
