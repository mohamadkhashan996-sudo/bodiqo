import { fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { followUser, unfollowUser } from "@/modules/users/services/social";
async function target(h: string) {
  const u = await prisma.user.findUnique({
    where: { handle: h },
    select: { id: true },
  });
  if (!u) throw new Error("User not found");
  return u.id;
}
export async function POST(
  _r: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
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
    const me = await requireUser();
    const { handle } = await params;
    return ok(await unfollowUser(me.id, await target(handle)));
  } catch (e) {
    return fail(e);
  }
}
