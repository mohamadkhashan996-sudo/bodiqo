import { createReadStream } from "node:fs";
import { access, constants, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fail, requireUser, guardApiAbuse } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ userId: string; file: string }> };

function safeSegment(value: string) {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

/**
 * Serves files from private storage. Always authenticated.
 * Allowed: owner path userId, asset owner, or conversation member with that mediaUrl.
 * Missing MediaAsset rows default to private (deny unless conversation share).
 */
export async function GET(_request: Request, context: Ctx) {
  try {
    await guardApiAbuse(_request, "media:userId:file:get", 180, 60000);
    const { userId, file } = await context.params;
    if (!safeSegment(userId) || !safeSegment(file)) {
      throw new AppError("Not found", 404);
    }

    const user = await requireUser();
    const url = `/api/media/${userId}/${file}`;
    const asset = await prisma.mediaAsset.findFirst({
      where: { originalUrl: url },
      select: { id: true, ownerId: true, mimeType: true },
    });

    if (user.id !== userId && asset?.ownerId !== user.id) {
      const shared = await prisma.message.findFirst({
        where: {
          mediaUrl: url,
          conversation: {
            members: { some: { userId: user.id, leftAt: null } },
          },
        },
        select: { id: true },
      });
      if (!shared) throw new AppError("Forbidden", 403);
    }

    const absolute = path.join(
      process.cwd(),
      "storage",
      "private",
      "uploads",
      userId,
      file,
    );
    try {
      await access(absolute, constants.R_OK);
    } catch {
      throw new AppError("Not found", 404);
    }

    const info = await stat(absolute);
    const stream = createReadStream(absolute);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": asset?.mimeType || "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
