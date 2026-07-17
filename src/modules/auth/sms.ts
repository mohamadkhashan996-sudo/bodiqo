import { logger } from "@/lib/logger";

/**
 * SMS provider interface.
 * SMS_PROVIDER=log (default) or twilio with TWILIO_* env vars.
 */
export async function sendSms(to: string, body: string) {
  const provider = (process.env.SMS_PROVIDER || "log").toLowerCase();

  if (
    provider === "twilio" &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM
  ) {
    const auth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
    ).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: process.env.TWILIO_FROM,
          Body: body,
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      logger.error("sms_twilio_failed", { status: res.status, text });
      throw new Error("SMS delivery failed");
    }
    logger.info("sms_sent", { to, provider: "twilio" });
    return { ok: true as const };
  }

  if (process.env.NODE_ENV === "production" && provider !== "twilio") {
    logger.error("sms_not_configured", { provider });
    throw new Error("SMS delivery is not configured");
  }

  logger.info("sms_preview", {
    to,
    body: body.replace(/\b\d{4,8}\b/g, "[redacted]"),
    provider: "log",
  });
  return { ok: true as const, preview: true as const };
}
