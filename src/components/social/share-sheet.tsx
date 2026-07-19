"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Check,
  Code2,
  Copy,
  Download,
  Link2,
  Mail,
  QrCode,
  Share2,
  UserRound,
} from "lucide-react";

import { useGuest } from "@/components/auth/guest-provider";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import {
  canNativeShare,
  copyText,
  externalShareUrl,
  nativeShare,
  postDeepLink,
  postEmbedSnippet,
  postShareUrl,
  recordPostShare,
  type ShareChannel,
  shareMessage,
} from "@/lib/share";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.47 14.38c-.28-.14-1.65-.81-1.9-.9-.26-.1-.44-.14-.63.14-.18.28-.72.9-.88 1.08-.16.18-.33.2-.6.07-.28-.14-1.16-.43-2.21-1.36-.82-.73-1.37-1.63-1.53-1.9-.16-.28-.02-.43.12-.57.13-.12.28-.33.42-.5.14-.16.18-.28.28-.47.09-.18.05-.35-.02-.49-.07-.14-.63-1.51-.86-2.07-.23-.55-.46-.47-.63-.48h-.54c-.18 0-.48.07-.73.35-.25.28-.96.94-.96 2.3s.98 2.67 1.12 2.85c.14.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.57.65.2 1.25.17 1.72.1.52-.08 1.65-.67 1.88-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.18-.53-.32z" />
      <path d="M12.04 2C6.58 2 2.15 6.43 2.15 11.89c0 1.75.46 3.45 1.33 4.95L2 22l5.3-1.39c1.44.79 3.06 1.2 4.74 1.2h.01c5.46 0 9.89-4.43 9.89-9.89C21.94 6.43 17.5 2 12.04 2zm0 18.08h-.01c-1.52 0-3.01-.41-4.31-1.18l-.31-.18-3.15.82.84-3.07-.2-.32a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.25-8.23 4.54 0 8.23 3.7 8.23 8.23 0 4.55-3.7 8.24-8.08 8.24z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M21.9 4.35 2.76 11.73c-1.3.51-1.29 1.22-.24 1.54l4.9 1.53 1.89 5.81c.23.64.37.89.8.89.42 0 .6-.19.84-.42l2.27-2.21 4.71 3.48c.87.48 1.49.23 1.71-.8L22.9 5.66c.28-1.12-.43-1.63-1-1.31zM9.4 14.97l-.24 3.42-.95-3.17L18.3 7.5l-8.9 7.47z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M14 9h3V6h-3c-1.93 0-3.5 1.57-3.5 3.5V12H8v3h2.5v7h3v-7H16l.5-3h-3V9.5c0-.28.22-.5.5-.5z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.6 3h2.8l-6.12 7 7.2 9.5h-5.64l-4.41-5.77L6.1 19.5H3.28l6.55-7.49L3 3h5.78l3.98 5.28L17.6 3zm-.98 14.86h1.55L7.46 4.55H5.8l10.82 13.31z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M6.94 8.5H3.56V20h3.38V8.5zM5.25 7.05a1.96 1.96 0 1 0 0-3.92 1.96 1.96 0 0 0 0 3.92zM20.44 20h-3.37v-5.6c0-1.33-.02-3.05-1.86-3.05-1.86 0-2.15 1.45-2.15 2.95V20H9.69V8.5h3.24v1.57h.05c.45-.85 1.55-1.75 3.19-1.75 3.41 0 4.04 2.25 4.04 5.17V20z" />
    </svg>
  );
}

type Target = {
  id: ShareChannel;
  label: string;
  className: string;
  icon: ReactNode;
  hideWhen?: boolean;
};

type ConversationRow = {
  conversationId?: string;
  conversation?: {
    id: string;
    type?: string;
    title?: string | null;
    members?: Array<{
      userId?: string;
      user?: {
        id?: string;
        handle?: string | null;
        displayName?: string | null;
        name?: string | null;
        image?: string | null;
      };
    }>;
  };
};

export function ShareSheet({
  open,
  onClose,
  postId,
  text,
  title = "Share",
  mediaUrl,
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  text?: string | null;
  title?: string;
  mediaUrl?: string | null;
  onShared?: (shareCount: number | null) => void;
}) {
  const { data: session } = useSession();
  const { requireAuth } = useGuest();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<ShareChannel | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [panel, setPanel] = useState<"main" | "qr" | "embed" | "internal">(
    "main",
  );
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const absoluteUrl = postShareUrl(postId);

  useEffect(() => {
    setNativeAvailable(canNativeShare());
  }, []);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setBusy(null);
      setStatus(null);
      setPanel("main");
      setQrDataUrl(null);
    }
  }, [open]);

  async function trackShare(channel: ShareChannel, recipientId?: string) {
    const result = await recordPostShare(postId, channel, { recipientId });
    onShared?.(result.shareCount);
    return result;
  }

  async function openQr() {
    setPanel("qr");
    if (qrDataUrl) return;
    setQrLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/share/qr`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || "Could not load QR");
        return;
      }
      setQrDataUrl(data.dataUrl ?? null);
      await trackShare("qr");
      setStatus("QR ready");
    } catch {
      setStatus("Could not load QR");
    } finally {
      setQrLoading(false);
    }
  }

  async function openInternal() {
    if (!requireAuth()) return;
    setPanel("internal");
    setInternalLoading(true);
    try {
      const res = await fetch("/api/conversations?limit=20");
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.conversations)
        ? data.conversations
        : [];
      setConversations(
        list.filter(
          (row: ConversationRow) =>
            !row.conversation?.type || row.conversation.type === "DIRECT",
        ),
      );
    } catch {
      setStatus("Could not load conversations");
    } finally {
      setInternalLoading(false);
    }
  }

  async function sendInternal(recipientId: string) {
    if (busy) return;
    setBusy("internal");
    setStatus(null);
    try {
      const result = await trackShare("internal", recipientId);
      setStatus(
        result.counted
          ? "Sent in Messages"
          : "Sent (already counted recently)",
      );
      window.setTimeout(() => onClose(), 900);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(null);
    }
  }

  async function downloadMedia() {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem("relune.downloads.allow")
        : null;
    if (raw === "0" || raw === "false") {
      setStatus("Downloads are turned off in Settings → Downloads");
      return;
    }
    if (!mediaUrl) {
      setStatus("This post has no downloadable media");
      return;
    }
    try {
      const res = await fetch(mediaUrl);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `relune-${postId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setStatus("Download started");
    } catch {
      // Cross-origin fallback: open in a new tab
      window.open(mediaUrl, "_blank", "noopener,noreferrer");
      setStatus("Opened media in a new tab");
    }
  }

  async function run(channel: ShareChannel) {
    if (busy) return;
    if (channel === "qr") {
      await openQr();
      return;
    }
    if (channel === "embed") {
      setPanel("embed");
      return;
    }
    if (channel === "internal") {
      await openInternal();
      return;
    }

    setBusy(channel);
    setStatus(null);
    const url = postShareUrl(postId, undefined, { channel });
    const message = shareMessage(text);

    try {
      if (channel === "copy") {
        await copyText(url);
        setCopied(true);
        setStatus("Link copied");
        await trackShare("copy");
        window.setTimeout(() => setCopied(false), 2000);
      } else if (channel === "native") {
        try {
          await nativeShare({
            title: "Relune",
            text: message,
            url,
          });
          await trackShare("native");
          setStatus("Shared");
        } catch (err) {
          if ((err as Error)?.name !== "AbortError") {
            setStatus("Could not open share sheet");
          }
        }
      } else {
        const href = externalShareUrl(channel, url, message);
        window.open(href, "_blank", "noopener,noreferrer");
        await trackShare(channel);
      }
    } catch {
      setStatus(channel === "copy" ? "Could not copy link" : "Could not share");
    } finally {
      setBusy(null);
    }
  }

  const targets: Target[] = [
    {
      id: "internal",
      label: "Send",
      className:
        "bg-[var(--signal-soft)] text-[var(--signal-deep)] border-2 border-[var(--signal-deep)]",
      icon: <UserRound className="size-5" />,
      hideWhen: !session?.user?.id,
    },
    {
      id: "copy",
      label: copied ? "Copied" : "Copy link",
      className:
        "bg-[var(--cloud-elevated)] text-[var(--ink)] border-2 border-[var(--mist-strong)]",
      icon: copied ? <Check className="size-5" /> : <Copy className="size-5" />,
    },
    {
      id: "qr",
      label: "QR code",
      className:
        "bg-[var(--cloud-elevated)] text-[var(--ink)] border-2 border-[var(--mist-strong)]",
      icon: <QrCode className="size-5" />,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      className: "bg-[#25D366] text-white",
      icon: <WhatsAppIcon className="size-5" />,
    },
    {
      id: "telegram",
      label: "Telegram",
      className: "bg-[#229ED9] text-white",
      icon: <TelegramIcon className="size-5" />,
    },
    {
      id: "facebook",
      label: "Facebook",
      className: "bg-[#1877F2] text-white",
      icon: <FacebookIcon className="size-5" />,
    },
    {
      id: "x",
      label: "X",
      className: "bg-[#111111] text-white",
      icon: <XIcon className="size-5" />,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      className: "bg-[#0A66C2] text-white",
      icon: <LinkedInIcon className="size-5" />,
    },
    {
      id: "email",
      label: "Email",
      className:
        "bg-[var(--cloud-elevated)] text-[var(--ink)] border-2 border-[var(--mist-strong)]",
      icon: <Mail className="size-5" />,
    },
    {
      id: "embed",
      label: "Embed",
      className:
        "bg-[var(--cloud-elevated)] text-[var(--ink)] border-2 border-[var(--mist-strong)]",
      icon: <Code2 className="size-5" />,
    },
    {
      id: "native",
      label: "More",
      className:
        "bg-[var(--signal-deep)] text-white border-2 border-[var(--signal-deep)]",
      icon: <Share2 className="size-5" />,
      hideWhen: !nativeAvailable,
    },
  ];

  const me = session?.user?.id;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {panel === "main" ? (
        <>
          <p className="text-sm text-[var(--muted-strong)]">
            Share internally, copy a tracked link, or open a social target.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {targets
              .filter((t) => !t.hideWhen)
              .map((target) => (
                <button
                  key={target.id}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void run(target.id)}
                  className="group flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-2 text-center transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  <span
                    className={`grid size-12 place-items-center rounded-full shadow-[var(--shadow-sm)] transition group-hover:shadow-[var(--shadow-md)] ${target.className}`}
                  >
                    {target.icon}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--ink)]">
                    {busy === target.id ? "…" : target.label}
                  </span>
                </button>
              ))}
            {mediaUrl ? (
              <button
                type="button"
                onClick={() => void downloadMedia()}
                className="group flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-2 text-center transition hover:-translate-y-0.5"
              >
                <span className="grid size-12 place-items-center rounded-full border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] text-[var(--ink)] shadow-[var(--shadow-sm)] transition group-hover:shadow-[var(--shadow-md)]">
                  <Download className="size-5" />
                </span>
                <span className="text-[11px] font-semibold text-[var(--ink)]">
                  Download
                </span>
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex min-w-0 items-center gap-2 rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-3 py-2.5">
            <Link2 className="size-4 shrink-0 text-[var(--muted-strong)]" />
            <p className="min-w-0 flex-1 truncate text-xs text-[var(--muted-strong)]">
              {absoluteUrl}
            </p>
            <button
              type="button"
              onClick={() => void run("copy")}
              className="shrink-0 text-xs font-semibold text-[var(--signal-deep)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            Deep link: {postDeepLink(postId)}
          </p>
        </>
      ) : null}

      {panel === "qr" ? (
        <div className="space-y-4">
          <button
            type="button"
            className="text-xs font-semibold text-[var(--signal-deep)]"
            onClick={() => setPanel("main")}
          >
            ← Back
          </button>
          <p className="text-sm text-[var(--muted-strong)]">
            Scan to open this post on Relune.
          </p>
          <div className="flex justify-center rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-white p-4">
            {qrLoading ? (
              <p className="text-sm text-[var(--muted)]">Generating…</p>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Post QR code" className="size-56" />
            ) : (
              <p className="text-sm text-[var(--muted)]">Unavailable</p>
            )}
          </div>
        </div>
      ) : null}

      {panel === "embed" ? (
        <div className="space-y-4">
          <button
            type="button"
            className="text-xs font-semibold text-[var(--signal-deep)]"
            onClick={() => setPanel("main")}
          >
            ← Back
          </button>
          <p className="text-sm text-[var(--muted-strong)]">
            Embed this public post on another site. Private posts won’t render
            for anonymous viewers.
          </p>
          <pre className="overflow-x-auto rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] p-3 text-[11px] leading-5 text-[var(--ink)] whitespace-pre-wrap">
            {postEmbedSnippet(postId)}
          </pre>
          <button
            type="button"
            className="icon-button min-h-10 px-4 text-sm"
            onClick={() => {
              void (async () => {
                await copyText(postEmbedSnippet(postId));
                await trackShare("embed");
                setStatus("Embed code copied");
              })();
            }}
          >
            Copy embed code
          </button>
        </div>
      ) : null}

      {panel === "internal" ? (
        <div className="space-y-4">
          <button
            type="button"
            className="text-xs font-semibold text-[var(--signal-deep)]"
            onClick={() => setPanel("main")}
          >
            ← Back
          </button>
          <p className="text-sm text-[var(--muted-strong)]">
            Send this post in a direct message. Recipients must be able to view
            it.
          </p>
          {internalLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No recent chats yet. Start a conversation from Messages first.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {conversations.map((row) => {
                const c = row.conversation;
                if (!c) return null;
                const other = c.members?.find((m) => m.userId !== me)?.user;
                const recipientId =
                  other?.id ||
                  c.members?.find((m) => m.userId !== me)?.userId;
                if (!recipientId) return null;
                const name =
                  other?.displayName ||
                  other?.name ||
                  (other?.handle ? `@${other.handle}` : "Member");
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void sendInternal(recipientId)}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] px-3 py-2 text-left hover:bg-[var(--mist)]/40 disabled:opacity-60"
                    >
                      <Avatar
                        src={other?.image}
                        name={name}
                        className="size-9 rounded-full"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
                        {name}
                      </span>
                      <span className="text-xs font-semibold text-[var(--signal-deep)]">
                        Send
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {status ? (
        <p className="mt-3 text-center text-xs font-semibold text-[var(--signal-deep)]">
          {status}
        </p>
      ) : null}
    </Modal>
  );
}
