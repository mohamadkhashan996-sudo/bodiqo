import { createReadStream } from "node:fs";
import { access, constants, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fail, optionalUser, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ userId: string; file: string }> };

function safeSegment(value: string) {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

export async function GET(_request: Request, context: Ctx) {
  try {
    const { userId, file } = await context.params;
    if (!safeSegment(userId) || !safeSegment(file)) {
      throw new AppError("Not found", 404);
    }

    const url = `/api/media/${userId}/${file}`;
    const asset = await prisma.mediaAsset.findFirst({
      where: { originalUrl: url },
      select: { id: true, ownerId: true, mimeType: true, meta: true },
    });

    const meta = (asset?.meta ?? {}) as { private?: boolean };
    const isPrivate = Boolean(meta.private);

    if (isPrivate) {
      const user = await requireUser();
      if (user.id !== userId) {
        // Allow if the file appears in a conversation the viewer belongs to.
        const allowed = await prisma.message.findFirst({
          where: {
            mediaUrl: url,
            conversation: { members: { some: { userId: user.id } } },
          },
          select: { id: true },
        });
        if (!allowed) throw new AppError("Forbidden", 403);
      }
    } else {
      // Public post media may still be served via this path for consistency.
      await optionalUser();
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
        "Cache-Control": isPrivate
          ? "private, no-store"
          : "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
