import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { AppError } from "@/lib/errors";
import {
  deleteStory,
  listContent,
  listHashtags,
  moderateComment,
  moderatePost,
} from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:content");
    await requireStaff("content:read");
    const { searchParams } = new URL(request.url);
    const kind = (searchParams.get("kind") ?? "posts") as
      | "posts"
      | "stories"
      | "videos"
      | "comments"
      | "communities"
      | "deleted";
    if (kind === ("hashtags" as string)) {
      return ok({ hashtags: await listHashtags() });
    }
    const items = await listContent({
      kind,
      q: searchParams.get("q") ?? undefined,
      take: Number(searchParams.get("take") ?? 40),
      cursor: searchParams.get("cursor") ?? undefined,
    });
    const hashtags = await listHashtags(20);
    return ok({ items, hashtags });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:content:write", 40);
    const staff = await requireStaff("content:moderate");
    const data = await body(
      request,
      z.object({
        target: z.enum(["post", "comment", "story"]),
        id: z.string().min(1),
        action: z.enum(["delete", "restore", "pin", "unpin"]),
      }),
    );
    if (data.target === "post") {
      if (!["delete", "restore", "pin", "unpin"].includes(data.action)) {
        throw new AppError("Invalid action", 400);
      }
      return ok(
        await moderatePost(
          staff.id,
          data.id,
          data.action as "delete" | "restore" | "pin" | "unpin",
        ),
      );
    }
    if (data.target === "comment") {
      if (data.action !== "delete" && data.action !== "restore") {
        throw new AppError("Invalid action", 400);
      }
      return ok(await moderateComment(staff.id, data.id, data.action));
    }
    if (data.action !== "delete") throw new AppError("Stories only support delete", 400);
    return ok(await deleteStory(staff.id, data.id));
  } catch (e) {
    return fail(e);
  }
}
