import { logger } from "@/lib/logger";

type Mail = { to: string; subject: string; html: string; text: string };

export async function sendMail(message: Mail): Promise<{ ok: true; previewToken?: string }> {
  // A provider can be added behind this interface without exposing mail calls to routes.
  if (process.env.NODE_ENV !== "production") {
    const previewToken = crypto.randomUUID();
    logger.info("mail_preview", { to: message.to, subject: message.subject, previewToken });
    return { ok: true, previewToken };
  }
  logger.info("mail_queued", { to: message.to, subject: message.subject });
  return { ok: true };
}
