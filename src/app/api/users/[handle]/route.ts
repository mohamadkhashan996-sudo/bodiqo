import { fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { getPublicProfile } from "@/modules/users/services/profile";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    await guardApiAbuse(request, "users:handle:get", 60, 60000);
    const { handle } = await params;
    const viewer = await optionalUser();
    const user = await getPublicProfile(handle, viewer?.id);
    if (!user) throw new AppError("User not found", 404);
    return ok({ user });
  } catch (e) {
    return fail(e);
  }
}
