import type { MediaKind, MediaStatus } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

import { writeAudit } from "./audit";

export async function listMediaAssets(opts: {
  kind?: MediaKind;
  status?: MediaStatus;
  take?: number;
}) {
  return prisma.mediaAsset.findMany({
    where: {
      kind: opts.kind,
      status: opts.status ?? { not: "DELETED" },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.take ?? 40, 100),
    include: {
      owner: { select: { id: true, handle: true, displayName: true } },
    },
  });
}

export async function registerMediaAsset(
  ownerId: string | null,
  data: {
    kind: MediaKind;
    originalUrl: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    durationMs?: number;
  },
) {
  // Optimization stubs: thumbnails / compression hooks for CDN workers
  const optimizedUrl = data.originalUrl;
  const thumbUrl =
    data.kind === "IMAGE" || data.kind === "VIDEO" ? data.originalUrl : null;

  return prisma.mediaAsset.create({
    data: {
      ownerId: ownerId ?? undefined,
      kind: data.kind,
      originalUrl: data.originalUrl,
      optimizedUrl,
      thumbUrl,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes ?? 0,
      width: data.width,
      height: data.height,
      durationMs: data.durationMs,
      status: "READY",
      meta: { optimized: true, streamingReady: data.kind === "VIDEO" },
    },
  });
}

export async function softDeleteMedia(actorId: string, mediaId: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!asset) throw new AppError("Media not found", 404);
  const updated = await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: { status: "DELETED" },
  });
  await writeAudit({ actorId, action: "admin.media.delete", target: mediaId });
  return updated;
}

export async function getStorageStats() {
  const [byKind, total] = await Promise.all([
    prisma.mediaAsset.groupBy({
      by: ["kind"],
      where: { status: { not: "DELETED" } },
      _sum: { sizeBytes: true },
      _count: { _all: true },
    }),
    prisma.mediaAsset.aggregate({
      where: { status: { not: "DELETED" } },
      _sum: { sizeBytes: true },
      _count: { _all: true },
    }),
  ]);
  return {
    totalBytes: total._sum.sizeBytes ?? 0,
    totalFiles: total._count._all,
    byKind: byKind.map((k) => ({
      kind: k.kind,
      files: k._count._all,
      bytes: k._sum.sizeBytes ?? 0,
    })),
  };
}
