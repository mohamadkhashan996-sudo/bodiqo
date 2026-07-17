import { z } from "zod";
import { optionalHttpUrlSchema } from "@/lib/security";

const UPLOADS_PREFIX = "/uploads/";
const PRIVATE_API_PREFIX = "/api/media/";

function isSafeUploadPath(pathname: string) {
  if (pathname.includes("..") || pathname.includes("\\") || pathname.includes("\0")) {
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
  if (pathname.includes("..") || pathname.includes("\\") || pathname.includes("\0")) {
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

export const mediaUrlSchema = z
  .string()
  .min(1)
  .refine(isMediaUrl, { message: "Invalid media URL" });

export const optionalMediaUrlSchema = mediaUrlSchema.optional();

/** Profile/website links — http(s) only (blocks javascript: XSS). */
export const optionalWebsiteSchema = optionalHttpUrlSchema;
