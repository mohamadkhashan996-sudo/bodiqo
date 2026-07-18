import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { createHash, createHmac, randomBytes } from "crypto";

import { AppError } from "@/lib/errors";

export const BCRYPT_ROUNDS = 12;

const COMMON = new Set([
  "password",
  "password1",
  "12345678",
  "qwerty123",
  "relune123",
  "cirqua123",
  "admin123",
  "letmein1",
]);

export function assertStrongPassword(password: string) {
  if (password.length < 8 || password.length > 128) {
    throw new AppError("Password must be 8–128 characters", 400);
  }
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new AppError("Password must include upper, lower, and a number", 400);
  }
  if (COMMON.has(password.toLowerCase())) {
    throw new AppError("Please choose a less common password", 400);
  }
}

export async function hashPassword(password: string) {
  assertStrongPassword(password);
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function opaquePepper() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("AUTH_SECRET is required", 500, "MISCONFIGURED");
    }
    return "relune-dev";
  }
  return secret;
}

/** HMAC-SHA256 opaque digests (OTP, recovery codes, device fingerprints). */
export function hashOpaque(value: string) {
  return createHmac("sha256", opaquePepper()).update(value).digest("hex");
}

/** Legacy SHA-256 digests still present in older rows. */
export function hashOpaqueLegacy(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqualHex(a: string, b: string) {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length !== right.length || left.length === 0) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function randomRecoveryCode() {
  return randomBytes(5)
    .toString("hex")
    .toUpperCase()
    .match(/.{1,5}/g)!
    .join("-");
}
