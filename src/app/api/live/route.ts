import { z } from "zod";

import {
  body,
  fail,
  guardApiAbuse,
  ok,
  optionalUser,
  requireUser,
} from "@/lib/api";
import { mediaUrlSchema } from "@/lib/media-url";
import {
  listLiveSessions,
  startLiveSession,
} from "@/modules/live/services/sessions";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "live:list", 60);
    await optionalUser();
    const q = new URL(request.url).searchParams;
    return ok({
      sessions: await listLiveSessions(Number(q.get("limit") ?? 30)),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "live:start", 10);
    const user = await requireUser();
    const input = await body(
      request,
      z.object({
        title: z.string().min(2).max(120),
        coverUrl: mediaUrlSchema.optional(),
      }),
    );
    return ok({ session: await startLiveSession(user.id, input) }, 201);
  } catch (e) {
    return fail(e);
  }
}
