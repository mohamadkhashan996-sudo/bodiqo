import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  detectDuplicateSignals,
  detectSpamSignals,
  detectToxicity,
  scoreContentModeration,
} from "@/modules/ai/services/intelligence";

/** Server-side spam gate for user-generated text. */
export function assertContentNotSpam(
  text: string | null | undefined,
  label = "Content",
) {
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

/** Server-side toxicity gate. */
export function assertContentNotToxic(
  text: string | null | undefined,
  label = "Content",
) {
  const value = text?.trim() ?? "";
  if (!value) {
    return { toxicLikely: false, score: 0, reasons: [] as string[] };
  }
  const result = detectToxicity(value);
  if (result.toxicLikely) {
    throw new AppError(
      `${label} was blocked for harmful or abusive language. Please revise and try again.`,
      422,
      "TOXICITY_BLOCKED",
    );
  }
  return result;
}

/** Combined spam + toxicity gate used on write paths. */
export function assertContentSafe(
  text: string | null | undefined,
  label = "Content",
) {
  const spam = assertContentNotSpam(text, label);
  const toxicity = assertContentNotToxic(text, label);
  return { spam, toxicity, moderation: scoreContentModeration(text ?? "") };
}

/** Block near-duplicate posts from the same author in a recent window. */
export async function assertNotDuplicatePost(
  authorId: string,
  body: string | null | undefined,
  windowHours = 48,
) {
  const value = body?.trim() ?? "";
  if (value.length < 12) {
    return {
      duplicateLikely: false,
      score: 0,
      similarity: 0,
      fingerprint: "",
    };
  }
  const since = new Date(Date.now() - windowHours * 3_600_000);
  const recent = await prisma.post.findMany({
    where: {
      authorId,
      createdAt: { gte: since },
      status: { not: "DELETED" },
    },
    select: { body: true },
    take: 40,
    orderBy: { createdAt: "desc" },
  });
  const result = detectDuplicateSignals(
    value,
    recent.map((p) => p.body),
  );
  if (result.duplicateLikely) {
    throw new AppError(
      "This looks like a duplicate of something you already posted recently.",
      422,
      "DUPLICATE_BLOCKED",
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
