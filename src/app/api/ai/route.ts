import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  detectFakeAccountSignals,
  detectSpamSignals,
  smartSearchExpand,
  suggestCaption,
  suggestComment,
  suggestHashtags,
  translateAssist,
  trendingPrediction,
} from "@/modules/ai/services/intelligence";
import { getSmartRecommendations } from "@/modules/ai/services/recommend";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "ai", 40);
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind") ?? "recommend";

    if (kind === "recommend") {
      return ok(await getSmartRecommendations(user.id));
    }

    if (kind === "search") {
      const q = searchParams.get("q") ?? "";
      return ok(smartSearchExpand(q));
    }

    if (kind === "trending") {
      const posts = await prisma.post.findMany({
        where: { status: "PUBLISHED", body: { contains: "#" } },
        select: { body: true },
        take: 300,
        orderBy: { createdAt: "desc" },
      });
      const counts = new Map<string, number>();
      for (const p of posts) {
        for (const tag of p.body.match(/#[\w]+/g) ?? []) {
          const key = tag.toLowerCase();
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      const topics = [...counts.entries()].map(([tag, count]) => ({ tag, count }));
      return ok({ predictions: trendingPrediction(topics).slice(0, 12) });
    }

    return ok({ error: "Unknown kind" }, 400);
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "ai:write", 30);
    await requireUser();
    const data = await body(
      request,
      z.object({
        action: z.enum([
          "caption",
          "hashtags",
          "comment",
          "spam",
          "fake",
          "translate",
        ]),
        text: z.string().max(4000).optional(),
        seed: z.string().max(500).optional(),
        targetLocale: z.string().max(12).optional(),
        userId: z.string().optional(),
      }),
    );

    if (data.action === "caption") return ok(suggestCaption(data.seed ?? data.text));
    if (data.action === "hashtags") return ok(suggestHashtags(data.text ?? ""));
    if (data.action === "comment") return ok(suggestComment(data.text ?? ""));
    if (data.action === "spam") return ok(detectSpamSignals(data.text ?? ""));
    if (data.action === "translate") {
      return ok(translateAssist(data.text ?? "", data.targetLocale ?? "en"));
    }
    if (data.action === "fake") {
      if (!data.userId) return ok({ error: "userId required" }, 400);
      const user = await prisma.user.findUnique({ where: { id: data.userId } });
      if (!user) return ok({ error: "not found" }, 404);
      return ok(
        detectFakeAccountSignals({
          trustScore: user.trustScore,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          postsCount: user.postsCount,
          emailVerified: Boolean(user.emailVerified),
          createdAt: user.createdAt,
        }),
      );
    }
    return ok({ error: "Unknown action" }, 400);
  } catch (e) {
    return fail(e);
  }
}
