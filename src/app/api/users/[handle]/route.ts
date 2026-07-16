import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await params;
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
        followersCount: true,
        followingCount: true,
        postsCount: true,
        createdAt: true,
      },
    });
    return user ? ok({ user }) : ok({ error: "User not found" }, 404);
  } catch (e) {
    return fail(e);
  }
}
