import { z } from "zod";
import {
  body,
  fail,
  guardApiAbuse,
  ok,
  optionalUser,
  requireUser,
} from "@/lib/api";
import { AppError } from "@/lib/errors";
import { optionalMediaUrlSchema } from "@/lib/media-url";
import {
  addStoryToHighlight,
  addStoryToNewOrDefaultHighlight,
  createHighlight,
  deleteHighlight,
  listHighlights,
} from "@/modules/media/services/highlights";

export async function GET(request: Request) {
  try {
    const viewer = await optionalUser();
    const handle =
      new URL(request.url).searchParams.get("handle") ||
      viewer?.handle ||
      null;
    if (!handle) {
      return ok({ highlights: [] });
    }
    return ok(await listHighlights(handle, viewer?.id));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "highlights:post", 20);
    const user = await requireUser();
    const data = await body(
      request,
      z.object({
        title: z.string().trim().min(1).max(40).optional(),
        coverUrl: optionalMediaUrlSchema,
        storyId: z.string().optional(),
        highlightId: z.string().optional(),
      }),
    );

    // Quick path: add active story into a highlight (creates default if needed).
    if (data.storyId && !data.highlightId && !data.title) {
      return ok(
        await addStoryToNewOrDefaultHighlight(user.id, data.storyId),
        201,
      );
    }

    if (data.storyId && data.highlightId) {
      const item = await addStoryToHighlight(
        user.id,
        data.highlightId,
        data.storyId,
      );
      return ok({ item }, 201);
    }

    const highlight = await createHighlight(user.id, {
      title: data.title || "Highlights",
      coverUrl: data.coverUrl,
    });
    if (data.storyId) {
      await addStoryToHighlight(user.id, highlight.id, data.storyId);
    }
    return ok({ highlight }, 201);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(request: Request) {
  try {
    await guardApiAbuse(request, "highlights:delete", 20);
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new AppError("Missing highlight id", 400);
    return ok(await deleteHighlight(user.id, id));
  } catch (e) {
    return fail(e);
  }
}
