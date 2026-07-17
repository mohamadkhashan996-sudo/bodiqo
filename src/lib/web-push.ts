import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  type?: string;
};

let configured = false;

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function ensureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT?.trim() || "mailto:noreply@relune.app",
      publicKey,
      privateKey,
    );
    configured = true;
  }
  return true;
}

export function isWebPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  if (!ensureVapid()) return { ok: false as const, gone: false };
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12, urgency: payload.type === "CALL" || payload.type === "MISSED_CALL" || payload.type === "MESSAGE" ? "high" : "normal" },
    );
    return { ok: true as const, gone: false };
  } catch (error) {
    const status =
      typeof error === "object" &&
      error &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 0;
    return { ok: false as const, gone: status === 404 || status === 410 };
  }
}
