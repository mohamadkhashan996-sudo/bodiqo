import { AppError } from "@/lib/errors";
import { detectSpamSignals } from "@/modules/ai/services/intelligence";

/** Server-side anti-spam gate for user-generated text. */
export function assertContentNotSpam(text: string | null | undefined, label = "Content") {
  const value = text?.trim() ?? "";
  if (!value) return { spamLikely: false, score: 0, reasons: [] as string[] };
  const result = detectSpamSignals(value);
  if (result.spamLikely) {
    throw new AppError(
      `${label} looks like spam and was blocked. Remove scam phrases or excess links and try again.`,
      422,
      "SPAM_BLOCKED",
    );
  }
  return result;
}

/** Silent honeypot rejection for bots that fill hidden fields. */
export function assertHoneypotEmpty(value: string | null | undefined) {
  if (value && value.trim()) {
    throw new AppError("Unable to complete this request", 400);
  }
}
