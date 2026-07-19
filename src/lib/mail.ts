import { site } from "@/config/site";
import { logger } from "@/lib/logger";

type Mail = { to: string; subject: string; html: string; text: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Mail provider interface.
 * Set MAIL_PROVIDER=resend + RESEND_API_KEY, or MAIL_PROVIDER=log (default).
 */
export async function sendMail(
  message: Mail,
): Promise<{ ok: true; previewToken?: string; id?: string }> {
  try {
    const { getSetting } = await import("@/modules/admin/services/settings");
    const emailCfg =
      (await getSetting<{ enabled?: boolean; from?: string }>("email")) ?? {};
    if (emailCfg.enabled === false) {
      logger.info("mail_disabled_by_settings", { to: message.to });
      return { ok: true, previewToken: "disabled" };
    }
  } catch {
    /* settings unavailable — continue with env provider */
  }

  const provider = (process.env.MAIL_PROVIDER || "log").toLowerCase();

  if (process.env.NODE_ENV === "production" && provider !== "resend") {
    logger.error("mail_not_configured", { provider });
    throw new Error("Email delivery is not configured");
  }

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.MAIL_FROM ||
            `Relune <noreply@${new URL(site.url).hostname}>`,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!res.ok) {
        logger.error("mail_resend_failed", { status: res.status, data });
        throw new Error(data.message || "Mail provider error");
      }
      logger.info("mail_sent", {
        to: message.to,
        provider: "resend",
        id: data.id,
      });
      return { ok: true, id: data.id };
    } catch (error) {
      logger.error("mail_send_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (process.env.NODE_ENV === "production") {
        throw error instanceof Error
          ? error
          : new Error("Email delivery failed");
      }
      // Dev: fall through to log mode
    }
  }

  if (process.env.NODE_ENV === "production" && provider === "resend") {
    throw new Error("Email delivery is not configured");
  }

  const previewToken = crypto.randomUUID();
  const linkMatch = message.text.match(/https?:\/\/\S+/);
  logger.info("mail_preview", {
    to: message.to,
    subject: message.subject,
    previewToken,
    provider,
    ...(process.env.NODE_ENV !== "production" && linkMatch
      ? { devLink: linkMatch[0] }
      : {}),
  });
  return { ok: true, previewToken };
}

function layout(title: string, bodyHtml: string) {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${safeTitle}</title></head>
<body style="margin:0;background:#F4F2EE;font-family:DM Sans,Helvetica,Arial,sans-serif;color:#0B0C0F;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" style="max-width:560px;background:#fff;border-radius:24px;padding:36px 32px;border:1px solid #E7E2D8;">
        <tr><td style="font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#1F9B8E;font-weight:700;">Relune</td></tr>
        <tr><td style="padding-top:16px;font-size:28px;font-weight:600;letter-spacing:-0.02em;">${safeTitle}</td></tr>
        <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#6F6A62;">${bodyHtml}</td></tr>
        <tr><td style="padding-top:28px;font-size:12px;color:#6F6A62;">${escapeHtml(site.tagline)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function welcomeEmail(name: string, verifyUrl: string) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(verifyUrl);
  return {
    subject: "Welcome to Relune",
    text: `Welcome ${name}. Verify your email: ${verifyUrl}`,
    html: layout(
      "Welcome",
      `<p>Hi ${safeName},</p><p>Your Relune space is ready. Confirm your email to begin.</p><p><a href="${safeUrl}" style="display:inline-block;background:#0B0C0F;color:#F4F2EE;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Verify email</a></p><p style="font-size:12px;word-break:break-all;">Or open: ${safeUrl}</p>`,
    ),
  };
}

export function verifyEmailTemplate(verifyUrl: string) {
  const safeUrl = escapeHtml(verifyUrl);
  return {
    subject: "Verify your Relune email",
    text: `Verify your email: ${verifyUrl}`,
    html: layout(
      "Verify your email",
      `<p>Confirm this address to secure your Relune account.</p><p><a href="${safeUrl}" style="display:inline-block;background:#1F9B8E;color:#0B0C0F;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Verify email</a></p><p style="font-size:12px;word-break:break-all;">${safeUrl}</p>`,
    ),
  };
}

export function resetPasswordEmail(resetUrl: string) {
  const safeUrl = escapeHtml(resetUrl);
  return {
    subject: "Reset your Relune password",
    text: `Reset your password: ${resetUrl}. This link expires soon.`,
    html: layout(
      "Reset password",
      `<p>We received a request to reset your password.</p><p><a href="${safeUrl}" style="display:inline-block;background:#0B0C0F;color:#F4F2EE;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Choose a new password</a></p><p style="font-size:12px;">If you didn’t ask for this, you can ignore this email.</p><p style="font-size:12px;word-break:break-all;">${safeUrl}</p>`,
    ),
  };
}

export function securityAlertEmail(detail: string) {
  const safeDetail = escapeHtml(detail);
  return {
    subject: "Relune security alert",
    text: detail,
    html: layout(
      "Security alert",
      `<p>${safeDetail}</p><p>If this wasn’t you, reset your password and review active sessions.</p>`,
    ),
  };
}
