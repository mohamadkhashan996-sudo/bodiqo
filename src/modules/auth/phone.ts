import { parsePhoneNumberFromString } from "libphonenumber-js";
import { AppError } from "@/lib/errors";

/** Normalize and validate to E.164 using libphonenumber. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new AppError("Phone number is required", 400);
  }

  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) {
    throw new AppError("Invalid phone number", 400);
  }

  return parsed.format("E.164");
}

export function maskPhone(phone: string) {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 3)}•••${phone.slice(-3)}`;
}

/** Stable placeholder email for phone-only accounts (email column is required). */
export function phoneAccountEmail(phone: string) {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  return `phone+${digits}@phone.relune.local`;
}
