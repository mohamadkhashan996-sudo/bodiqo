import type { MediaKind } from "@prisma/client";

import { AppError } from "@/lib/errors";
import {
  assertOwnedMediaUrl,
  isMediaUrl,
  mediaPathOwnerId,
} from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

export type OwnedAssetOpts = {
  kinds?: MediaKind[];
  /** Require READY status (default true). */
  ready?: boolean;
};

/**
 * Path ownership + MediaAsset registry check.
 * Blocks binding another user's upload (including private DM media) into posts/messages.
 */
export async function assertOwnedReadyAsset(
  ownerId: string,
  url: string,
  opts?: OwnedAssetOpts,
) {
  assertOwnedMediaUrl(ownerId, url);

  const asset = await prisma.mediaAsset.findFirst({
    where: {
      originalUrl: url,
      ownerId,
      status: opts?.ready === false ? { not: "DELETED" } : "READY",
    },
    select: {
      id: true,
      kind: true,
      mimeType: true,
      width: true,
      height: true,
      durationMs: true,
      thumbUrl: true,
      status: true,
    },
  });

  if (!asset) {
    throw new AppError("Media not found, not ready, or not owned by you", 400);
  }
  if (opts?.kinds && !opts.kinds.includes(asset.kind)) {
    throw new AppError("This media type is not allowed here", 400);
  }
  return asset;
}

export async function assertOwnedReadyAssets(
  ownerId: string,
  urls: Array<string | null | undefined>,
  opts?: OwnedAssetOpts,
) {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))];
  const assets = [];
  for (const url of unique) {
    assets.push(await assertOwnedReadyAsset(ownerId, url, opts));
  }
  return assets;
}

/** Soft-validate optional nullable fields used in community/profile patches. */
export async function assertOptionalOwnedMedia(
  ownerId: string,
  url: string | null | undefined,
  opts?: OwnedAssetOpts,
) {
  if (url == null || url === "") return null;
  return assertOwnedReadyAsset(ownerId, url, opts);
}

export function mediaKindFromClientLabel(
  kind: string,
): MediaKind | undefined {
  switch (kind.toUpperCase()) {
    case "IMAGE":
      return "IMAGE";
    case "GIF":
      return "GIF";
    case "VIDEO":
      return "VIDEO";
    case "AUDIO":
    case "VOICE":
      return "VOICE";
    case "FILE":
    case "DOCUMENT":
      return "DOCUMENT";
    default:
      return undefined;
  }
}

export { assertOwnedMediaUrl,isMediaUrl, mediaPathOwnerId };
