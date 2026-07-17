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
  getFeed,
  getPostsByHandle,
} from "@/modules/feed/services/posts";
import { MediaKind, PostType, PostVisibility } from "@prisma/client";
import { z } from "zod";
import { mediaUrlSchema } from "@/lib/media-url";

const schema = z.object({
  body: z.string().max(10000).optional(),
  type: z.nativeEnum(PostType).optional(),
  visibility: z.nativeEnum(PostVisibility).optional(),
  linkUrl: z.string().url().optional(),
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
});

export async function GET(r: Request) {
  try {
    const u = await optionalUser();
    const q = new URL(r.url).searchParams;
    const author = q.get("author");
    if (author) {
      return ok(await getPostsByHandle(author, Number(q.get("limit") ?? 30), u?.id));
    }
    return ok(
      await getFeed({
        userId: u?.id,
        cursor: q.get("cursor") ?? undefined,
        limit: Number(q.get("limit") ?? 20),
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
