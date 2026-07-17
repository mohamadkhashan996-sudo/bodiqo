import {
  body,
  fail,
  guardApiAbuse,
  ok,
  optionalUser,
  requireUser,
} from "@/lib/api";
import {
  createPost,
  getAuthorWorkspacePosts,
  getFeed,
  getPostsByHandle,
  type FeedMode,
} from "@/modules/feed/services/posts";
import { MediaKind, PostStatus, PostType, PostVisibility } from "@prisma/client";
import { z } from "zod";
import { mediaUrlSchema } from "@/lib/media-url";
import { clampInt, httpUrlSchema } from "@/lib/security";

const schema = z.object({
  body: z.string().max(10000).optional(),
  type: z.nativeEnum(PostType).optional(),
  visibility: z.nativeEnum(PostVisibility).optional(),
  linkUrl: httpUrlSchema.optional(),
  status: z
    .enum([PostStatus.PUBLISHED, PostStatus.DRAFT, PostStatus.SCHEDULED])
    .optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  media: z
    .array(
      z.object({
        url: mediaUrlSchema,
        kind: z.nativeEnum(MediaKind),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        duration: z.number().positive().optional(),
      }),
    )
    .max(10)
    .optional(),
  poll: z
    .object({
      options: z.array(z.string().trim().min(1).max(80)).min(2).max(6),
      endsAt: z.string().datetime().optional().nullable(),
    })
    .optional(),
});

const feedModes = z.enum([
  "home",
  "following",
  "latest",
  "trending",
  "foryou",
]);

export async function GET(r: Request) {
  try {
    await guardApiAbuse(r, "posts:get", 90);
    const u = await optionalUser();
    const q = new URL(r.url).searchParams;
    const author = q.get("author");
    const mine = q.get("mine");
    if (mine === "drafts" || mine === "scheduled") {
      const me = await requireUser();
      return ok(
        await getAuthorWorkspacePosts(
          me.id,
          mine === "drafts" ? "DRAFT" : "SCHEDULED",
          clampInt(q.get("limit"), 30, 1, 50),
        ),
      );
    }
    if (author) {
      return ok(
        await getPostsByHandle(
          author,
          clampInt(q.get("limit"), 30, 1, 50),
          u?.id,
        ),
      );
    }
    const mode = (feedModes.safeParse(q.get("mode") ?? "home").data ??
      "home") as FeedMode;
    return ok(
      await getFeed({
        userId: u?.id,
        cursor: q.get("cursor") ?? undefined,
        limit: clampInt(q.get("limit"), 20, 1, 50),
        mode,
      }),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(r: Request) {
  try {
    await guardApiAbuse(r, "posts:write", 30);
    const u = await requireUser();
    return ok({ post: await createPost(u.id, await body(r, schema)) }, 201);
  } catch (e) {
    return fail(e);
  }
}
