"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCheck,
  Copy,
  FileText,
  Flag,
  Forward,
  Lock,
  MoreHorizontal,
  Reply,
  Smile,
  Trash2,
} from "lucide-react";

import { decryptFromPeer } from "@/lib/e2e-crypto";

export type ChatMessage = {
  id: string;
  conversationId: string;
  body: string;
  mediaUrl: string | null;
  type: string;
  senderId: string;
  createdAt: string;
  delivery: "SENT" | "DELIVERED" | "SEEN";
  isEdited: boolean;
  isEncrypted?: boolean;
  ciphertext?: string | null;
  nonce?: string | null;
  senderEphemeralKey?: string | null;
  deletedForAll: boolean;
  sender: {
    id: string;
    name: string | null;
    displayName?: string | null;
    handle: string | null;
    image: string | null;
  };
  replyTo?: {
    body: string;
    sender: { name: string | null; handle: string | null };
  } | null;
  forwardedFromId?: string | null;
  reactions: { emoji: string; userId: string }[];
};

const REACTIONS = ["✨", "🤍", "🔥", "👏", "😂"];

export function MessageBubble({
  message,
  mine,
  showReceipts = true,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onCopy,
  onForward,
  onReport,
}: {
  message: ChatMessage;
  mine: boolean;
  showReceipts?: boolean;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onReport?: () => void;
}) {
  const [body, setBody] = useState(message.body);
  const [reactOpen, setReactOpen] = useState(false);
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  useEffect(() => {
    let cancelled = false;
    async function decrypt() {
      if (!message.isEncrypted || !message.ciphertext || !message.nonce) {
        setBody(message.body);
        return;
      }
      try {
        const plain = await decryptFromPeer({
          ciphertext: message.ciphertext,
          nonce: message.nonce,
          senderEphemeralKey: message.senderEphemeralKey,
        });
        if (!cancelled) setBody(plain);
      } catch {
        if (!cancelled) setBody("Encrypted message");
      }
    }
    void decrypt();
    return () => {
      cancelled = true;
    };
  }, [message]);

  return (
    <div className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[min(85%,24rem)] rounded-[1.4rem] px-3 py-2.5 shadow-[var(--shadow-sm)] sm:px-4 sm:py-3 ${
          mine
            ? "rounded-br-md bg-[var(--ink)] text-[var(--cloud)]"
            : "rounded-bl-md border border-[color:color-mix(in_srgb,var(--mist)_70%,transparent)] bg-[var(--surface)] text-[var(--ink)]"
        }`}
      >
        {!mine ? (
          <p className="mb-1 text-[11px] font-bold tracking-[0.14em] text-[var(--signal)] uppercase">
            {message.sender.displayName ??
              message.sender.name ??
              message.sender.handle}
          </p>
        ) : null}
        {message.replyTo ? (
          <div
            className={`mb-2 border-l-2 pl-2 text-xs ${
              mine
                ? "border-[var(--ember)] text-white/90"
                : "border-[var(--signal)] text-[var(--muted-strong)]"
            }`}
          >
            Replying to{" "}
            {message.replyTo.sender.name ?? message.replyTo.sender.handle}:{" "}
            {message.replyTo.body}
          </div>
        ) : null}
        {message.forwardedFromId ? (
          <p
            className={`mb-1 text-[10px] font-semibold tracking-wide uppercase ${
              mine ? "text-white/70" : "text-[var(--muted)]"
            }`}
          >
            Forwarded
          </p>
        ) : null}
        {message.deletedForAll ? (
          <p className="italic opacity-60">This message was removed.</p>
        ) : (
          <>
            {message.mediaUrl && message.type === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.mediaUrl}
                alt=""
                className="mb-2 max-h-64 rounded-[var(--radius-lg)] object-cover"
              />
            ) : null}
            {message.mediaUrl && message.type === "VIDEO" ? (
              <video
                src={message.mediaUrl}
                controls
                className="mb-2 max-h-72 w-full rounded-[var(--radius-lg)]"
              />
            ) : null}
            {message.mediaUrl && message.type === "AUDIO" ? (
              <audio
                src={message.mediaUrl}
                controls
                className="mb-2 w-full max-w-[16rem] min-w-0 sm:min-w-[14rem]"
              />
            ) : null}
            {message.mediaUrl &&
            (message.type === "FILE" || message.type === "DOCUMENT") ? (
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noreferrer"
                className={`mb-2 inline-flex items-center gap-2 rounded-[var(--radius-lg)] px-3 py-2 text-sm font-medium ${
                  mine
                    ? "border-2 border-white/70 bg-black/35"
                    : "border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)]"
                }`}
              >
                <FileText className="size-4" />
                Open file
              </a>
            ) : null}
            {body ? (
              <p className="text-sm leading-6 whitespace-pre-wrap">
                {message.isEncrypted ? (
                  <span className="mr-1.5 inline-flex align-middle text-[var(--signal)]">
                    <Lock className="size-3" />
                  </span>
                ) : null}
                {body}
              </p>
            ) : null}
          </>
        )}
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] ${
            mine ? "justify-end text-white/90" : "text-[var(--muted-strong)]"
          }`}
        >
          <span>
            {message.isEdited && "edited · "}
            {time}
          </span>
          {mine && showReceipts ? (
            message.delivery === "SEEN" ? (
              <CheckCheck className="size-3 text-[var(--ember)]" />
            ) : message.delivery === "DELIVERED" ? (
              <CheckCheck className="size-3" />
            ) : (
              <Check className="size-3" />
            )
          ) : null}
        </div>
        {message.reactions.length > 0 ? (
          <div
            className={`absolute -bottom-3 ${mine ? "right-2" : "left-2"} flex rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-2 py-0.5 text-xs shadow-[var(--shadow-sm)]`}
          >
            {[
              ...new Set(message.reactions.map((reaction) => reaction.emoji)),
            ].join(" ")}
          </div>
        ) : null}
        <div
          className={`surface-panel absolute -top-3 hidden gap-1 rounded-full p-1 shadow-[var(--shadow-md)] group-hover:flex max-md:!flex ${
            mine ? "right-0" : "left-0"
          }`}
        >
          <button
            type="button"
            onClick={onReply}
            aria-label="Reply"
            className="icon-button size-7"
          >
            <Reply className="size-3" />
          </button>
          {onCopy && body ? (
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copy"
              className="icon-button size-7"
            >
              <Copy className="size-3" />
            </button>
          ) : null}
          {onForward && !message.isEncrypted ? (
            <button
              type="button"
              onClick={onForward}
              aria-label="Forward"
              className="icon-button size-7"
            >
              <Forward className="size-3" />
            </button>
          ) : null}
          <div className="relative">
            <button
              type="button"
              onClick={() => setReactOpen((v) => !v)}
              aria-label="React"
              className="icon-button size-7"
            >
              <Smile className="size-3" />
            </button>
            {reactOpen ? (
              <div className="absolute bottom-9 left-0 z-10 flex gap-1 rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="grid size-7 place-items-center rounded-full hover:bg-[var(--mist)]"
                    onClick={() => {
                      onReact(emoji);
                      setReactOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {mine && !message.isEncrypted ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit"
              className="icon-button size-7"
            >
              <MoreHorizontal className="size-3" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className="icon-button size-7"
          >
            <Trash2 className="size-3" />
          </button>
          {!mine && onReport ? (
            <button
              type="button"
              onClick={onReport}
              aria-label="Report"
              className="icon-button size-7"
            >
              <Flag className="size-3" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
