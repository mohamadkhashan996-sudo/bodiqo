"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, Phone, Users, Video } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { MessageBubble, type ChatMessage } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { TypingIndicator } from "./typing-indicator";
import {
  ensureIdentityKeys,
  encryptForPeer,
  fetchPeerPublicKey,
} from "@/lib/e2e-crypto";

type Conversation = {
  id: string;
  title: string | null;
  type: string;
  members: {
    userId: string;
    user: {
      id: string;
      name: string | null;
      displayName: string | null;
      handle: string | null;
      image: string | null;
      presence: string;
    };
  }[];
};

export function ChatThread({ conversationId }: { conversationId: string }) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { socket } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [e2eReady, setE2eReady] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void ensureIdentityKeys()
      .then(() => setE2eReady(true))
      .catch(() => setE2eReady(false));
  }, []);

  useEffect(() => {
    void Promise.all([
      fetch(`/api/conversations/${conversationId}`).then((r) => r.json()),
      fetch(`/api/conversations/${conversationId}/messages`).then((r) => r.json()),
    ]).then(([thread, history]) => {
      setConversation(thread.conversation ?? null);
      setMessages(history.messages ?? []);
      socket?.emit("message:seen", { conversationId });
      socket?.emit("message:delivered", { conversationId });
    });
  }, [conversationId, socket]);

  useEffect(() => {
    const append = (message: ChatMessage) => {
      if (message.conversationId === conversationId) {
        setMessages((old) =>
          old.some((item) => item.id === message.id) ? old : [...old, message],
        );
      }
    };
    const update = (message: ChatMessage) =>
      setMessages((old) => old.map((item) => (item.id === message.id ? message : item)));
    const removed = ({ messageId }: { messageId: string }) =>
      setMessages((old) => old.filter((item) => item.id !== messageId));
    const type = ({
      conversationId: id,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (id === conversationId && userId !== currentUserId) setTypingUser(userId);
    };
    const stop = ({ conversationId: id }: { conversationId: string }) => {
      if (id === conversationId) setTypingUser(null);
    };
    const reaction = ({
      messageId,
      reaction,
    }: {
      messageId: string;
      reaction: { emoji: string; userId: string };
    }) => {
      setMessages((old) =>
        old.map((item) => {
          if (item.id !== messageId) return item;
          const exists = item.reactions.some(
            (r) => r.userId === reaction.userId && r.emoji === reaction.emoji,
          );
          return {
            ...item,
            reactions: exists
              ? item.reactions
              : [...item.reactions, reaction],
          };
        }),
      );
    };
    const seen = ({
      conversationId: id,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (id !== conversationId || userId === currentUserId) return;
      setMessages((old) =>
        old.map((item) =>
          item.senderId === currentUserId
            ? { ...item, delivery: "SEEN" as const }
            : item,
        ),
      );
    };
    socket?.on("message:new", append);
    socket?.on("message:updated", update);
    socket?.on("message:deleted", removed);
    socket?.on("message:reaction", reaction);
    socket?.on("message:seen", seen);
    socket?.on("typing:start", type);
    socket?.on("typing:stop", stop);
    return () => {
      socket?.off("message:new", append);
      socket?.off("message:updated", update);
      socket?.off("message:deleted", removed);
      socket?.off("message:reaction", reaction);
      socket?.off("message:seen", seen);
      socket?.off("typing:start", type);
      socket?.off("typing:stop", stop);
    };
  }, [conversationId, currentUserId, socket]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  const peer = useMemo(
    () => conversation?.members.find((member) => member.userId !== currentUserId)?.user,
    [conversation, currentUserId],
  );

  async function send(payload: { body: string; type: string; mediaUrl?: string }) {
    const input: Record<string, unknown> = {
      type: payload.type,
      body: payload.body,
      mediaUrl: payload.mediaUrl,
      replyToId: reply?.id,
    };

    if (
      e2eReady &&
      conversation?.type === "DIRECT" &&
      peer?.id &&
      payload.type === "TEXT" &&
      !payload.mediaUrl
    ) {
      try {
        const peerKey = await fetchPeerPublicKey(peer.id);
        if (peerKey) {
          const encrypted = await encryptForPeer(payload.body, peerKey);
          input.isEncrypted = true;
          input.ciphertext = encrypted.ciphertext;
          input.nonce = encrypted.nonce;
          input.senderEphemeralKey = encrypted.senderEphemeralKey;
          input.body = "";
        }
      } catch {
        /* fall back to plaintext */
      }
    }

    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (data.message) setMessages((old) => [...old, data.message]);
    setReply(null);
  }

  function typing(active: boolean) {
    socket?.emit(active ? "typing:start" : "typing:stop", { conversationId });
  }

  function invite(type: "AUDIO" | "VIDEO") {
    const callees =
      conversation?.type === "GROUP"
        ? conversation.members
            .filter((m) => m.userId !== currentUserId)
            .map((m) => m.userId)
        : peer
          ? [peer.id]
          : [];
    if (!callees.length) return;
    socket?.emit(
      "call:invite",
      { conversationId, calleeIds: callees.slice(0, 1), type },
      (result: { ok: boolean; data?: unknown }) => {
        if (result.ok && result.data) {
          window.dispatchEvent(
            new CustomEvent("relune:call-start", { detail: result.data }),
          );
        }
      },
    );
  }

  async function edit(message: ChatMessage) {
    const next = window.prompt("Edit your message", message.body);
    if (!next?.trim()) return;
    const payload = await fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: next }),
    }).then((r) => r.json());
    if (payload.message) {
      setMessages((old) =>
        old.map((item) => (item.id === message.id ? payload.message : item)),
      );
    }
  }

  if (!conversation) {
    return (
      <div className="grid flex-1 place-items-center text-sm text-[var(--muted)]">
        Opening your circle…
      </div>
    );
  }

  const name =
    conversation.title ??
    peer?.displayName ??
    peer?.name ??
    peer?.handle ??
    "Conversation";
  const isGroup = conversation.type === "GROUP";

  return (
    <section className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-[var(--radius-2xl)] bg-[radial-gradient(circle_at_80%_0%,color-mix(in_srgb,var(--ember)_22%,transparent),transparent_34%),transparent]">
      <header className="surface-subtle flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] px-5 py-4 backdrop-blur-xl">
        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-tight">
            {isGroup ? <Users className="size-4 text-[var(--signal)]" /> : null}
            {name}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
            {isGroup
              ? `${conversation.members.length} members`
              : peer?.presence === "ONLINE"
                ? "Online"
                : "Offline"}
            {e2eReady && !isGroup ? (
              <span className="inline-flex items-center gap-1 text-[var(--signal)]">
                <Lock className="size-3" />
                E2E
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => invite("AUDIO")}
            className="icon-button size-10"
            aria-label="Voice call"
          >
            <Phone className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => invite("VIDEO")}
            className="icon-button size-10"
            aria-label="Video call"
          >
            <Video className="size-4" />
          </button>
        </div>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            mine={message.senderId === currentUserId}
            onReply={() => setReply(message)}
            onReact={(emoji) => {
              void fetch(`/api/messages/${message.id}/react`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emoji }),
              });
              socket?.emit("message:react", { messageId: message.id, emoji });
            }}
            onEdit={() => void edit(message)}
            onDelete={() =>
              void fetch(
                `/api/messages/${message.id}?forEveryone=${message.senderId === currentUserId}`,
                { method: "DELETE" },
              )
            }
          />
        ))}
        {typingUser ? (
          <TypingIndicator name={peer?.name ?? peer?.handle ?? undefined} />
        ) : null}
        <div ref={bottom} />
      </div>
      <MessageComposer
        onSend={send}
        onTyping={typing}
        reply={reply?.body}
        onCancelReply={() => setReply(null)}
      />
    </section>
  );
}
