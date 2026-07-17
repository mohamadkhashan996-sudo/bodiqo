import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  detectDuplicateSignals,
  detectFakeAccountSignals,
  detectSpamSignals,
  detectToxicity,
  scoreContentModeration,
  smartSearchExpand,
  suggestCaption,
  suggestComment,
  suggestHashtags,
  translateAssist,
  trendingPrediction,
} from "@/modules/ai/services/intelligence";
import { getSmartRecommendations } from "@/modules/ai/services/recommend";

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
      const topics = [...counts.entries()].map(([tag, count]) => ({
        tag,
        count,
      }));
      return ok({ predictions: trendingPrediction(topics).slice(0, 12) });
    }

    throw new AppError("Unknown kind", 400);
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "ai:write", 30);
    const user = await requireUser();
    const data = await body(
      request,
      z.object({
        action: z.enum([
          "caption",
          "hashtags",
          "comment",
          "spam",
          "toxicity",
          "duplicate",
          "moderate",
          "fake",
          "translate",
        ]),
        text: z.string().max(4000).optional(),
        seed: z.string().max(500).optional(),
        targetLocale: z.string().max(12).optional(),
        userId: z.string().optional(),
      }),
    );

    if (data.action === "caption") {
      return ok(suggestCaption(data.seed ?? data.text));
    }
    if (data.action === "hashtags") {
      return ok(suggestHashtags(data.text ?? ""));
    }
    if (data.action === "comment") {
      return ok(suggestComment(data.text ?? ""));
    }
    if (data.action === "spam") {
      return ok(detectSpamSignals(data.text ?? ""));
    }
    if (data.action === "toxicity") {
      return ok(detectToxicity(data.text ?? ""));
    }
    if (data.action === "moderate") {
      return ok(scoreContentModeration(data.text ?? ""));
    }
    if (data.action === "duplicate") {
      const recent = await prisma.post.findMany({
        where: {
          authorId: user.id,
          createdAt: { gte: new Date(Date.now() - 48 * 3_600_000) },
          status: { not: "DELETED" },
        },
        select: { body: true },
        take: 40,
        orderBy: { createdAt: "desc" },
      });
      return ok(
        detectDuplicateSignals(
          data.text ?? "",
          recent.map((p) => p.body),
        ),
      );
    }
    if (data.action === "translate") {
      return ok(translateAssist(data.text ?? "", data.targetLocale ?? "en"));
    }
    if (data.action === "fake") {
      if (!data.userId) throw new AppError("userId required", 400);
      const target = await prisma.user.findUnique({
        where: { id: data.userId },
      });
      if (!target) throw new AppError("not found", 404);
      return ok(
        detectFakeAccountSignals({
          trustScore: target.trustScore,
          followersCount: target.followersCount,
          followingCount: target.followingCount,
          postsCount: target.postsCount,
          emailVerified: Boolean(target.emailVerified),
          createdAt: target.createdAt,
        }),
      );
    }
    throw new AppError("Unknown action", 400);
  } catch (e) {
    return fail(e);
  }
}
