import { fail, ok, optionalUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getProfileVisibility } from "@/modules/users/services/visibility";

export async function GET(
  _r: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await params;
    const viewer = await optionalUser();
    const user = await prisma.user.findFirst({
      where: { handle: handle.toLowerCase(), status: "ACTIVE" },
      select: {
        id: true,
        handle: true,
        name: true,
        displayName: true,
        bio: true,
        website: true,
        country: true,
        city: true,
        image: true,
        coverImage: true,
        isVerified: true,
        isPrivate: true,
        followersCount: true,
        followingCount: true,
        postsCount: true,
        createdAt: true,
      },
    });
    if (!user) return ok({ error: "User not found" }, 404);

    const visibility = await getProfileVisibility(user, viewer?.id);
    const payload = {
      ...user,
      followersCount: visibility.canViewFollowers ? user.followersCount : null,
      followingCount: visibility.canViewFollowing ? user.followingCount : null,
      postsCount: visibility.canViewContent ? user.postsCount : null,
      visibility,
    };

    return ok({ user: payload });
  } catch (e) {
    return fail(e);
  }
}
