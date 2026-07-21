import { fail, guardApiAbuse, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { peekAuthChallenge } from "@/modules/auth/challenges";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "auth:challenge:get", 20, 60000);
    const token = new URL(request.url).searchParams.get("token");
    if (!token) throw new AppError("Missing token", 400);
    for (const purpose of ["PHONE_2FA", "CREDENTIALS_2FA"] as const) {
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
