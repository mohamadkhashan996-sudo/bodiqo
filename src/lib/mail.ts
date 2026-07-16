import { logger } from "@/lib/logger";
import { site } from "@/config/site";

type Mail = { to: string; subject: string; html: string; text: string };

/**
 * Mail provider interface.
 * Set MAIL_PROVIDER=resend + RESEND_API_KEY, or MAIL_PROVIDER=log (default).
 */
export async function sendMail(
  message: Mail,
): Promise<{ ok: true; previewToken?: string; id?: string }> {
  const provider = (process.env.MAIL_PROVIDER || "log").toLowerCase();

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || `Relune <noreply@${new URL(site.url).hostname}>`,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) {
        logger.error("mail_resend_failed", { status: res.status, data });
        throw new Error(data.message || "Mail provider error");
      }
      logger.info("mail_sent", { to: message.to, provider: "resend", id: data.id });
      return { ok: true, id: data.id };
    } catch (error) {
      logger.error("mail_send_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fall through to log mode so auth flows don't hard-fail in misconfigured envs
    }
  }

  const previewToken = crypto.randomUUID();
  logger.info("mail_preview", {
    to: message.to,
    subject: message.subject,
    previewToken,
    provider,
  });
  return { ok: true, previewToken };
}

function layout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="margin:0;background:#F4F2EE;font-family:DM Sans,Helvetica,Arial,sans-serif;color:#0B0C0F;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" style="max-width:560px;background:#fff;border-radius:24px;padding:36px 32px;border:1px solid #E7E2D8;">
        <tr><td style="font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#1F9B8E;font-weight:700;">Relune</td></tr>
        <tr><td style="padding-top:16px;font-size:28px;font-weight:600;letter-spacing:-0.02em;">${title}</td></tr>
        <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#6F6A62;">${bodyHtml}</td></tr>
        <tr><td style="padding-top:28px;font-size:12px;color:#6F6A62;">${site.tagline}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function welcomeEmail(name: string, verifyUrl: string) {
  return {
    subject: "Welcome to Relune",
    text: `Welcome ${name}. Verify your email: ${verifyUrl}`,
    html: layout(
      "Welcome",
      `<p>Hi ${name},</p><p>Your Relune space is ready. Confirm your email to begin.</p><p><a href="${verifyUrl}" style="display:inline-block;background:#0B0C0F;color:#F4F2EE;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Verify email</a></p><p style="font-size:12px;word-break:break-all;">Or open: ${verifyUrl}</p>`,
    ),
  };
}

export function verifyEmailTemplate(verifyUrl: string) {
  return {
    subject: "Verify your Relune email",
    text: `Verify your email: ${verifyUrl}`,
    html: layout(
      "Verify your email",
      `<p>Confirm this address to secure your Relune account.</p><p><a href="${verifyUrl}" style="display:inline-block;background:#1F9B8E;color:#0B0C0F;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Verify email</a></p><p style="font-size:12px;word-break:break-all;">${verifyUrl}</p>`,
    ),
  };
}

export function resetPasswordEmail(resetUrl: string) {
  return {
    subject: "Reset your Relune password",
    text: `Reset your password: ${resetUrl}. This link expires soon.`,
    html: layout(
      "Reset password",
      `<p>We received a request to reset your password.</p><p><a href="${resetUrl}" style="display:inline-block;background:#0B0C0F;color:#F4F2EE;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Choose a new password</a></p><p style="font-size:12px;">If you didn’t ask for this, you can ignore this email.</p><p style="font-size:12px;word-break:break-all;">${resetUrl}</p>`,
    ),
  };
}

export function securityAlertEmail(detail: string) {
  return {
    subject: "Relune security alert",
    text: detail,
    html: layout("Security alert", `<p>${detail}</p><p>If this wasn’t you, reset your password and review active sessions.</p>`),
  };
}

export function notificationDigestEmail(summary: string) {
  return {
    subject: "Your Relune activity",
    text: summary,
    html: layout("Activity", `<p>${summary}</p><p><a href="${site.url}/notifications">Open notifications</a></p>`),
  };
}
