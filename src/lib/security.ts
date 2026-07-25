import { z } from "zod";

/** Escape text for safe HTML embedding (XSS). */
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Remove HTML/script tags from user-authored plain text fields. */
export function stripHtmlTags(value: string) {
  return value
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .trim();
}

/** Only allow http(s) absolute URLs or empty — blocks javascript:/data: XSS. */
export function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeHttpUrl(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  return isSafeHttpUrl(trimmed) ? trimmed : null;
}

export const httpUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(isSafeHttpUrl, { message: "URL must be http or https" });

export const optionalHttpUrlSchema = z
  .union([httpUrlSchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    return value;
  });

/** Clamp query/limit integers to a safe range. */
export function clampInt(
  raw: string | null | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
