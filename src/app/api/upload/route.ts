import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MediaKind } from "@prisma/client";

import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import {
  ALLOWED_MIME,
  extFor,
  optimizeImageBuffer,
  quickContentScan,
  resolveMaxBytes,
  sniffKind,
} from "@/lib/media-processing";
import { isMediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/modules/admin/services/settings";

function parsePositiveInt(value: FormDataEntryValue | null) {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n);
}

function kindMaxMbFromSettings(
  kind: MediaKind,
  mediaLimits: {
    imageMaxMb?: number;
    videoMaxMb?: number;
    voiceMaxMb?: number;
    documentMaxMb?: number;
  } | null,
) {
  if (kind === "VIDEO") return mediaLimits?.videoMaxMb ?? 200;
  if (kind === "IMAGE" || kind === "GIF") return mediaLimits?.imageMaxMb ?? 10;
  if (kind === "VOICE") return mediaLimits?.voiceMaxMb ?? 20;
  if (kind === "DOCUMENT") return mediaLimits?.documentMaxMb ?? 25;
  return 50;
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "upload", 20);
    const user = await requireUser();
    const [storage, mediaLimits, videoLimits] = await Promise.all([
      getSetting<{ maxUploadMb?: number; provider?: string }>("storage"),
      getSetting<{
        imageMaxMb?: number;
        videoMaxMb?: number;
        voiceMaxMb?: number;
        documentMaxMb?: number;
      }>("mediaLimits"),
      getSetting<{ allowShorts?: boolean; maxDurationSec?: number }>(
        "videoLimits",
      ),
    ]);

    const globalMaxMb = storage?.maxUploadMb ?? 50;
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (
      Number.isFinite(contentLength) &&
      contentLength > 0 &&
      contentLength > globalMaxMb * 1024 * 1024 + 256_000
    ) {
      throw new AppError(
        `Upload exceeds ${globalMaxMb}MB request limit`,
        413,
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const isPrivate = String(form.get("private") || "") === "1";
    const purpose = String(form.get("purpose") || "").toLowerCase();
    const clientWidth = parsePositiveInt(form.get("width"));
    const clientHeight = parsePositiveInt(form.get("height"));
    const durationMs = parsePositiveInt(form.get("durationMs"));
    const thumbUrlRaw = String(form.get("thumbUrl") || "").trim();

    if (!(file instanceof File)) throw new AppError("File required", 400);

    if (file.size > globalMaxMb * 1024 * 1024) {
      throw new AppError(
        `File exceeds ${globalMaxMb}MB upload limit`,
        413,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > globalMaxMb * 1024 * 1024) {
      throw new AppError(
        `File exceeds ${globalMaxMb}MB upload limit`,
        413,
      );
    }

    const sniffed = sniffKind(buffer, file.type || "");
    if (!sniffed || !ALLOWED_MIME.has(sniffed.mime)) {
      throw new AppError("Unsupported file type", 415);
    }

    if (purpose === "short" || purpose === "shorts") {
      if (videoLimits?.allowShorts === false) {
        throw new AppError("Shorts uploads are disabled", 403);
      }
      if (sniffed.kind !== "VIDEO") {
        throw new AppError("Shorts require an MP4 or WebM video", 415);
      }
    }

    if (purpose === "avatar" || purpose === "cover") {
      if (sniffed.kind !== "IMAGE") {
        throw new AppError("Profile media must be a JPEG, PNG, or WebP image", 415);
      }
    }

    const kindMaxMb = kindMaxMbFromSettings(sniffed.kind, mediaLimits);
    const maxBytes = resolveMaxBytes({
      kind: sniffed.kind,
      kindMaxMb,
      globalMaxMb,
    });
    if (buffer.byteLength > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      throw new AppError(`File exceeds ${maxMb}MB upload limit`, 413);
    }

    const maxDurationSec = videoLimits?.maxDurationSec ?? 600;
    if (
      sniffed.kind === "VIDEO" &&
      durationMs &&
      durationMs / 1000 > maxDurationSec
    ) {
      throw new AppError(
        `Video must be ${maxDurationSec} seconds or shorter`,
        400,
      );
    }

    const scan = quickContentScan(buffer, sniffed.kind);
    if (!scan.ok) {
      throw new AppError(scan.reason, 400);
    }

    let outBuffer = buffer;
    let outMime = sniffed.mime;
    let outKind = sniffed.kind;
    let width = clientWidth ?? null;
    let height = clientHeight ?? null;
    let optimized = false;

    if (sniffed.kind === "IMAGE") {
      const optimizedResult = await optimizeImageBuffer(buffer, sniffed.mime);
      outBuffer = Buffer.from(optimizedResult.buffer);
      outMime = optimizedResult.mime;
      optimized = optimizedResult.optimized;
      if (optimizedResult.width) width = optimizedResult.width;
      if (optimizedResult.height) height = optimizedResult.height;
      outKind = ALLOWED_MIME.get(outMime) ?? sniffed.kind;
    }

    if (thumbUrlRaw) {
      if (!isMediaUrl(thumbUrlRaw)) {
        throw new AppError("Invalid thumbnail URL", 400);
      }
      const thumbOwner = thumbUrlRaw.includes(`/uploads/${user.id}/`)
        || thumbUrlRaw.includes(`/api/media/${user.id}/`);
      if (!thumbOwner) {
        throw new AppError("Thumbnail must belong to your account", 400);
      }
      const thumbAsset = await prisma.mediaAsset.findFirst({
        where: {
          originalUrl: thumbUrlRaw,
          ownerId: user.id,
          status: "READY",
        },
        select: { id: true },
      });
      if (!thumbAsset) {
        throw new AppError("Thumbnail asset not found", 400);
      }
    }

    const ext = extFor(outMime);
    const name = `${randomUUID()}.${ext}`;
    const relative = path.join("uploads", user.id, name);

    if (isPrivate) {
      const absolute = path.join(process.cwd(), "storage", "private", relative);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, outBuffer);
    } else {
      const absolute = path.join(process.cwd(), "public", relative);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, outBuffer);
    }

    const url = isPrivate
      ? `/api/media/${user.id}/${name}`
      : `/${relative.replace(/\\/g, "/")}`;

    // Local disk today; provider setting reserved for S3/R2 workers.
    const provider = storage?.provider === "s3" ? "local-pending-s3" : "local";

    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId: user.id,
        kind: outKind,
        originalUrl: url,
        optimizedUrl: optimized ? url : null,
        thumbUrl: thumbUrlRaw || null,
        mimeType: outMime,
        sizeBytes: outBuffer.byteLength,
        width,
        height,
        durationMs: durationMs ?? null,
        status: "READY",
        meta: {
          originalName: file.name.slice(0, 180),
          private: isPrivate,
          purpose: purpose || undefined,
          optimized,
          provider,
          claimedMime: file.type || null,
          scanned: "quick",
        },
      },
    });

    return ok({
      url,
      kind:
        outKind === "VOICE"
          ? "AUDIO"
          : outKind === "DOCUMENT"
            ? "FILE"
            : outKind,
      assetId: asset.id,
      sizeBytes: outBuffer.byteLength,
      mimeType: outMime,
      thumbUrl: thumbUrlRaw || null,
      width,
      height,
      durationMs: durationMs ?? null,
      optimized,
    });
  } catch (error) {
    return fail(error);
  }
}
