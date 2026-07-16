import { z } from "zod";

export function isMediaUrl(value: string) {
  if (value.startsWith("/uploads/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const mediaUrlSchema = z
  .string()
  .min(1)
  .refine(isMediaUrl, { message: "Invalid media URL" });

export const optionalMediaUrlSchema = mediaUrlSchema.optional();

export const optionalWebsiteSchema = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    return value;
  });
