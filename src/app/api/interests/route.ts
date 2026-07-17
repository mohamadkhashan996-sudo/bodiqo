import { fail, ok, guardApiAbuse } from "@/lib/api";
import { cached } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "interests:get", 60, 60000);
    const interests = await cached("catalog:interests", 300, () =>
      prisma.interest.findMany({ orderBy: { name: "asc" } }),
    );
    return ok({ interests });
  } catch (e) {
    return fail(e);
  }
}
