/** Client-safe helpers for post sharing. */

import { track } from "@/lib/analytics";

export type ShareChannel =
  | "copy"
  | "native"
  | "whatsapp"
  | "telegram"
  | "facebook"
  | "x"
  | "email"
  | "linkedin"
  | "qr"
  | "embed"
  | "internal";

const CHANNEL_TO_API: Record<ShareChannel, string> = {
  copy: "COPY",
  native: "NATIVE",
  whatsapp: "WHATSAPP",
  telegram: "TELEGRAM",
  facebook: "FACEBOOK",
  x: "X",
  email: "EMAIL",
  linkedin: "LINKEDIN",
  qr: "QR",
  embed: "EMBED",
  internal: "INTERNAL",
};

export function postShareUrl(
  postId: string,
  origin?: string,
  opts?: { channel?: ShareChannel },
) {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const url = new URL(`${base.replace(/\/$/, "")}/post/${postId}`);
  url.searchParams.set("utm_source", "relune");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "post_share");
  if (opts?.channel) {
    url.searchParams.set("utm_content", opts.channel);
  }
  return url.toString();
}

export function postEmbedUrl(postId: string, origin?: string) {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/embed/post/${postId}`;
}

export function postEmbedSnippet(postId: string, origin?: string) {
  const src = postEmbedUrl(postId, origin);
  return `<iframe src="${src}" width="560" height="720" style="border:0;border-radius:16px;max-width:100%;" loading="lazy" allowfullscreen title="Relune post"></iframe>`;
}

/** App / Universal Link style path (web fallback is /post/:id). */
export function postDeepLink(postId: string) {
  return `relune://post/${postId}`;
}

export function shareMessage(text?: string | null) {
  const trimmed = text?.trim();
  if (!trimmed) return "Check this out on Relune";
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}…` : trimmed;
}

export function externalShareUrl(
  channel: Exclude<ShareChannel, "copy" | "native" | "qr" | "embed" | "internal">,
  url: string,
  text: string,
) {
  switch (channel) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case "x":
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    case "email":
      return `mailto:?subject=${encodeURIComponent("Shared from Relune")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  }
}

export async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const el = document.createElement("textarea");
  el.value = value;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

export function canNativeShare() {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

export async function nativeShare(input: {
  title: string;
  text: string;
  url: string;
}) {
  if (!canNativeShare()) throw new Error("Native share unavailable");
  await navigator.share({
    title: input.title,
    text: input.text,
    url: input.url,
  });
}

/** Record a share on the server; returns updated shareCount when available. */
export async function recordPostShare(
  postId: string,
  channel: ShareChannel = "copy",
  extra?: { recipientId?: string },
): Promise<{ shareCount: number | null; counted: boolean }> {
  const res = await fetch(`/api/posts/${postId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: CHANNEL_TO_API[channel],
      recipientId: extra?.recipientId,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Share failed");
  }
  const data = await res.json().catch(() => ({}));
  const count = data?.post?.shareCount;
  const counted = Boolean(data?.counted ?? true);
  track("post_share", {
    postId,
    channel,
    counted,
  });
  return {
    shareCount: typeof count === "number" ? count : null,
    counted,
  };
}
