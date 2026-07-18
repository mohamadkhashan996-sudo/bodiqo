import { fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { getExplore } from "@/modules/feed/services/posts";
import { getSuggestedUsers } from "@/modules/users/services/suggestions";

export async function GET(r: Request) {
  try {
    await guardApiAbuse(r, "explore:get", 90, 60000);
    const u = await optionalUser();
    const q = new URL(r.url).searchParams;
    const mode = q.get("mode");
    const fresh = q.get("fresh") === "1";
    if (mode === "users") {
      return ok({
        users: await getSuggestedUsers(Number(q.get("limit") ?? 8), u?.id),
      });
    }
    if (mode === "communities") {
      const { prisma } = await import("@/lib/prisma");
      const communities = await prisma.community.findMany({
        where: {
          visibility: "PUBLIC",
          ...(u?.id
            ? { members: { none: { userId: u.id, status: "JOINED" } } }
            : {}),
        },
        select: {
          id: true,
          slug: true,
          name: true,
          membersCount: true,
          image: true,
          category: true,
        },
        orderBy: [{ membersCount: "desc" }, { createdAt: "desc" }],
        take: Math.min(Number(q.get("limit") ?? 12) || 12, 24),
      });
      return ok({ communities });
    }
    return ok(
      await getExplore(
        q.get("cursor") ?? undefined,
        Number(q.get("limit") ?? 20),
        u?.id,
        { fresh },
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
