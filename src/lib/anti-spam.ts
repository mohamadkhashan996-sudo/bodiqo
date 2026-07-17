import { AppError } from "@/lib/errors";
import { detectSpamSignals } from "@/modules/ai/services/intelligence";
import {
  assertContentNotSpam as assertSpam,
  assertContentSafe,
  assertHoneypotEmpty,
  assertNotDuplicatePost,
} from "@/lib/ai-content-gate";

/** @deprecated Prefer assertContentSafe from ai-content-gate. */
export function assertContentNotSpam(
  text: string | null | undefined,
  label = "Content",
) {
  return assertSpam(text, label);
}

export { assertHoneypotEmpty, assertContentSafe, assertNotDuplicatePost };

/** Soft check that returns signals without throwing (for UI previews). */
export function previewSpam(text: string) {
  return detectSpamSignals(text);
}

export function softSpamOrThrow(text: string, label = "Content") {
  const result = detectSpamSignals(text);
  if (result.spamLikely) {
    throw new AppError(
      `${label} looks like spam and was blocked.`,
      422,
      "SPAM_BLOCKED",
    );
  }
  return result;
}
