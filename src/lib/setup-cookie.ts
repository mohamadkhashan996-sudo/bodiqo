import { createHmac } from "crypto";

/**
 * Edge-safe helpers for the setup-complete cookie.
 * Keep this file free of Prisma / Node-only imports so middleware can use it.
 */
export const SETUP_COOKIE = "bodiqo_setup";

export function setupCookieValue(secret = process.env.AUTH_SECRET || "") {
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update("bodiqo:setup:complete:v1")
    .digest("hex");
}

export function isValidSetupCookie(
  value: string | undefined | null,
  secret = process.env.AUTH_SECRET || "",
) {
  if (!value || !secret) return false;
  return value === setupCookieValue(secret);
}
