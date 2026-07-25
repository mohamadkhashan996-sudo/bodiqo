import { z } from "zod";

import { AppError } from "@/lib/errors";
import { optionalHttpUrlSchema } from "@/lib/security";

const UPLOADS_PREFIX = "/uploads/";
const PRIVATE_API_PREFIX = "/api/media/";

function isSafeUploadPath(pathname: string) {
  if (
    pathname.includes("..") ||
    pathname.includes("\\") ||
    pathname.includes("\0")
  ) {
    return false;
  }
  // /uploads/{userId}/{file} — userId and filename without path traversal
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "uploads" || parts.length !== 3) return false;
  const [, userId, file] = parts;
  return Boolean(
    userId &&
    file &&
    /^[a-zA-Z0-9_-]+$/.test(userId) &&
    /^[a-zA-Z0-9._-]+$/.test(file),
  );
}

function isSafePrivateApiPath(pathname: string) {
  if (
    pathname.includes("..") ||
    pathname.includes("\\") ||
    pathname.includes("\0")
  ) {
    return false;
  }
  const parts = pathname.split("/").filter(Boolean);
  // api/media/{userId}/{file}
  if (parts[0] !== "api" || parts[1] !== "media" || parts.length !== 4) {
    return false;
  }
  const userId = parts[2]!;
  const file = parts[3]!;
  return /^[a-zA-Z0-9_-]+$/.test(userId) && /^[a-zA-Z0-9._-]+$/.test(file);
}

/** Same-origin Relune media only — no arbitrary remote URLs. */
export function isMediaUrl(value: string) {
  if (value.startsWith(UPLOADS_PREFIX)) {
    return isSafeUploadPath(value);
  }
  if (value.startsWith(PRIVATE_API_PREFIX)) {
    return isSafePrivateApiPath(value);
  }
  return false;
}

/** Extract owning user id from a Relune media path, if present. */
export function mediaPathOwnerId(value: string): string | null {
  if (!isMediaUrl(value)) return null;
  try {
    const parts = value.split("/").filter(Boolean);
    if (parts[0] === "uploads" && parts.length === 3) return parts[1] ?? null;
    if (
      parts[0] === "api" &&
      parts[1] === "media" &&
      parts.length === 4
    ) {
      return parts[2] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Ensure a profile media URL belongs to the mutator (path userId match).
 * Blocks binding another user's uploaded file as avatar/cover.
 */
export function assertOwnedMediaUrl(ownerId: string, value: string | null) {
  if (!value) return;
  if (!isMediaUrl(value)) {
    throw new AppError("Invalid media URL", 400);
  }
  const pathOwner = mediaPathOwnerId(value);
  if (pathOwner !== ownerId) {
    throw new AppError("Media does not belong to this account", 400);
  }
}

export const mediaUrlSchema = z
  .string()
  .min(1)
  .refine(isMediaUrl, { message: "Invalid media URL" });

export const optionalMediaUrlSchema = mediaUrlSchema.optional();

/** Profile/website links — http(s) only (blocks javascript: XSS). */
export const optionalWebsiteSchema = optionalHttpUrlSchema;
