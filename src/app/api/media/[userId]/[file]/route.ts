import { createReadStream } from "node:fs";
import { access, constants, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { fail, guardApiAbuse, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ userId: string; file: string }> };

function safeSegment(value: string) {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

function parseRange(header: string | null, size: number) {
  if (!header || !header.startsWith("bytes=")) return null;
  const spec = header.slice(6).split(",")[0]?.trim();
  if (!spec) return null;
  const [startRaw, endRaw] = spec.split("-");
  let start = startRaw === "" ? NaN : Number(startRaw);
  let end = endRaw === "" || endRaw == null ? size - 1 : Number(endRaw);
  if (Number.isNaN(start)) {
    // suffix bytes: bytes=-500
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) return null;
  if (end >= size) end = size - 1;
  if (start > end) return null;
  return { start, end };
}

/**
 * Serves files from private storage. Always authenticated.
 * Allowed: owner path userId, asset owner, or conversation member with that mediaUrl.
 * Supports HTTP Range for audio/video scrubbing.
 */
export async function GET(request: Request, context: Ctx) {
  try {
    await guardApiAbuse(request, "media:userId:file:get", 180, 60000);
    const { userId, file } = await context.params;
    if (!safeSegment(userId) || !safeSegment(file)) {
      throw new AppError("Not found", 404);
    }

    const user = await requireUser();
    const url = `/api/media/${userId}/${file}`;
    const asset = await prisma.mediaAsset.findFirst({
      where: { originalUrl: url },
      select: {
        id: true,
        ownerId: true,
        mimeType: true,
        kind: true,
        status: true,
      },
    });

    if (asset?.status === "DELETED" || asset?.status === "FAILED") {
      throw new AppError("Not found", 404);
    }

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
    const mime = asset?.mimeType || "application/octet-stream";
    const isDocument = asset?.kind === "DOCUMENT" || mime === "application/pdf";
    const disposition = isDocument
      ? `attachment; filename="${file.replace(/"/g, "")}"`
      : `inline; filename="${file.replace(/"/g, "")}"`;

    const range = parseRange(request.headers.get("range"), info.size);
    const commonHeaders: Record<string, string> = {
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": disposition,
    };

    if (range) {
      const { start, end } = range;
      const chunkSize = end - start + 1;
      const stream = createReadStream(absolute, { start, end });
      const webStream = Readable.toWeb(stream) as unknown as ReadableStream;
      return new Response(webStream, {
        status: 206,
        headers: {
          ...commonHeaders,
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
        },
      });
    }

    const stream = createReadStream(absolute);
    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;
    return new Response(webStream, {
      headers: {
        ...commonHeaders,
        "Content-Length": String(info.size),
      },
    });
  } catch (e) {
    return fail(e);
  }
}
