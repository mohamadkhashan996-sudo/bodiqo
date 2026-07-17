import { fail, ok, requireUser, guardApiAbuse} from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { followUser, unfollowUser } from "@/modules/users/services/social";

async function target(h: string) {
  const u = await prisma.user.findUnique({
    where: { handle: h.toLowerCase() },
    select: { id: true },
  });
  if (!u) throw new AppError("User not found", 404);
  return u.id;
}

export async function POST(
  _r: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    await guardApiAbuse(_r, "users:handle:follow:post");
    const me = await requireUser();
    const { handle } = await params;
    return ok({ follow: await followUser(me.id, await target(handle)) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  _r: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    await guardApiAbuse(_r, "users:handle:follow:delete");
    const me = await requireUser();
    const { handle } = await params;
    return ok(await unfollowUser(me.id, await target(handle)));
  } catch (e) {
    return fail(e);
  }
}
