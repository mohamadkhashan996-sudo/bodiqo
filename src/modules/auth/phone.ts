import { AppError } from "@/lib/errors";

/** Normalize to E.164-ish: digits with leading + */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) {
    throw new AppError("Phone must include country code (e.g. +1…)", 400);
  }
  const only = `+${digits.slice(1).replace(/\D/g, "")}`;
  if (only.length < 10 || only.length > 16) {
    throw new AppError("Invalid phone number", 400);
  }
  return only;
}

export function maskPhone(phone: string) {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 3)}•••${phone.slice(-3)}`;
}
