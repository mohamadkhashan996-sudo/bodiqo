/**
 * Edge-safe setup cookie helpers (Web Crypto — works in middleware + Node).
 */

export const SETUP_COOKIE = "bodiqo_setup";

async function hmacHex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function setupCookieValue(
  secret = process.env.AUTH_SECRET || "",
) {
  if (!secret) return "";
  return hmacHex(secret, "bodiqo:setup:complete:v1");
}

export async function isValidSetupCookie(
  value: string | undefined | null,
  secret = process.env.AUTH_SECRET || "",
) {
  if (!value || !secret) return false;
  const expected = await setupCookieValue(secret);
  return value === expected;
}
