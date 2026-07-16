import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
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
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new AppError(
      "Password must include upper, lower, and a number",
      400,
    );
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

export function hashOpaque(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomRecoveryCode() {
  return randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-");
}
