"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Lock,
  LogOut,
  Phone,
  Search,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { MessageBubble, type ChatMessage } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { TypingIndicator } from "./typing-indicator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    role?: string;
    user: {
      id: string;
      name: string | null;
      displayName: string | null;
      handle: string | null;
      image: string | null;
      presence: string;
      lastSeenAt?: string | null;
    };
  }[];
};

type SearchHit = ChatMessage & {
  conversationId: string;
};

export function ChatThread({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { socket } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [e2eReady, setE2eReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<
    {
      id: string;
      handle: string;
      displayName?: string | null;
      name?: string | null;
    }[]
  >([]);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void ensureIdentityKeys()
      .then(() => setE2eReady(true))
      .catch(() => setE2eReady(false));
  }, []);

  useEffect(() => {
    socket?.emit("conversation:join", { conversationId });
    void Promise.all([
      fetch(`/api/conversations/${conversationId}`).then((r) => r.json()),
      fetch(`/api/conversations/${conversationId}/messages`).then((r) =>
        r.json(),
      ),
    ]).then(([thread, history]) => {
      setConversation(thread.conversation ?? null);
      setMessages(history.messages ?? []);
      socket?.emit("message:seen", { conversationId });
      socket?.emit("message:delivered", { conversationId });
    });
    return () => {
      socket?.emit("conversation:leave", { conversationId });
      socket?.emit("typing:stop", { conversationId });
    };
  }, [conversationId, socket]);

  useEffect(() => {
    const append = (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return;
      setMessages((old) =>
        old.some((item) => item.id === message.id) ? old : [...old, message],
      );
      if (message.senderId !== currentUserId) {
        socket?.emit("message:delivered", {
          conversationId,
          messageId: message.id,
        });
        socket?.emit("message:seen", {
          conversationId,
          messageId: message.id,
        });
      }
    };
    const update = (message: ChatMessage) =>
      setMessages((old) =>
        old.map((item) => (item.id === message.id ? message : item)),
      );
    const removed = ({
      messageId,
      forEveryone,
      userId,
    }: {
      messageId: string;
      forEveryone?: boolean;
      userId?: string;
    }) => {
      setMessages((old) => {
        if (forEveryone) {
          return old.map((item) =>
            item.id === messageId
              ? { ...item, deletedForAll: true, body: "", mediaUrl: null }
              : item,
          );
        }
        if (userId === currentUserId) {
          return old.filter((item) => item.id !== messageId);
        }
        return old;
      });
    };
    const type = ({
      conversationId: id,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (id === conversationId && userId !== currentUserId) {
        setTypingUserId(userId);
      }
    };
    const stop = ({ conversationId: id }: { conversationId: string }) => {
      if (id === conversationId) setTypingUserId(null);
    };
    const reaction = ({
      messageId,
      reaction,
    }: {
      messageId: string;
      reaction: { emoji: string; userId: string; removed?: boolean };
    }) => {
      setMessages((old) =>
        old.map((item) => {
          if (item.id !== messageId) return item;
          if (reaction.removed) {
            return {
              ...item,
              reactions: item.reactions.filter(
                (r) =>
                  !(
                    r.userId === reaction.userId && r.emoji === reaction.emoji
                  ),
              ),
            };
          }
          const exists = item.reactions.some(
            (r) => r.userId === reaction.userId && r.emoji === reaction.emoji,
          );
          return exists
            ? item
            : {
                ...item,
                reactions: [
                  ...item.reactions,
                  { emoji: reaction.emoji, userId: reaction.userId },
                ],
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
    const delivered = ({
      conversationId: id,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (id !== conversationId || userId === currentUserId) return;
      setMessages((old) =>
        old.map((item) =>
          item.senderId === currentUserId && item.delivery === "SENT"
            ? { ...item, delivery: "DELIVERED" as const }
            : item,
        ),
      );
    };
    const presence = ({
      userId,
      status,
    }: {
      userId: string;
      status: string;
    }) => {
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((member) =>
            member.userId === userId
              ? { ...member, user: { ...member.user, presence: status } }
              : member,
          ),
        };
      });
    };
    socket?.on("message:new", append);
    socket?.on("message:updated", update);
    socket?.on("message:deleted", removed);
    socket?.on("message:reaction", reaction);
    socket?.on("message:seen", seen);
    socket?.on("message:delivered", delivered);
    socket?.on("typing:start", type);
    socket?.on("typing:stop", stop);
    socket?.on("presence:changed", presence);
    return () => {
      socket?.off("message:new", append);
      socket?.off("message:updated", update);
      socket?.off("message:deleted", removed);
      socket?.off("message:reaction", reaction);
      socket?.off("message:seen", seen);
      socket?.off("message:delivered", delivered);
      socket?.off("typing:start", type);
      socket?.off("typing:stop", stop);
      socket?.off("presence:changed", presence);
    };
  }, [conversationId, currentUserId, socket]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUserId]);

  useEffect(() => {
    if (!searchOpen || !searchQuery.trim()) {
      setSearchHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void fetch(
        `/api/messages/search?q=${encodeURIComponent(searchQuery.trim())}&conversationId=${conversationId}`,
      )
        .then((r) => r.json())
        .then((d) => setSearchHits(d.messages ?? []))
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchOpen, searchQuery, conversationId]);

  useEffect(() => {
    if (!memberQuery.trim()) {
      setMemberResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(memberQuery)}`)
        .then((r) => r.json())
        .then((d) => setMemberResults(d.users ?? []));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [memberQuery]);

  const peer = useMemo(
    () =>
      conversation?.members.find((member) => member.userId !== currentUserId)
        ?.user,
    [conversation, currentUserId],
  );

  const typingName = useMemo(() => {
    if (!typingUserId || !conversation) return undefined;
    const member = conversation.members.find((m) => m.userId === typingUserId)
      ?.user;
    return member?.displayName ?? member?.name ?? member?.handle ?? undefined;
  }, [conversation, typingUserId]);

  async function send(payload: {
    body: string;
    type: string;
    mediaUrl?: string;
  }) {
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

    const response = await fetch(
      `/api/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const data = await response.json();
    if (data.message) {
      setMessages((old) =>
        old.some((item) => item.id === data.message.id)
          ? old
          : [...old, data.message],
      );
    }
    setReply(null);
  }

  const typing = useCallback(
    (active: boolean) => {
      socket?.emit(active ? "typing:start" : "typing:stop", { conversationId });
    },
    [socket, conversationId],
  );

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
      { conversationId, calleeIds: callees, type },
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

  async function react(message: ChatMessage, emoji: string) {
    setMessages((old) =>
      old.map((item) => {
        if (item.id !== message.id || !currentUserId) return item;
        const exists = item.reactions.some(
          (r) => r.userId === currentUserId && r.emoji === emoji,
        );
        return {
          ...item,
          reactions: exists
            ? item.reactions
            : [...item.reactions, { emoji, userId: currentUserId }],
        };
      }),
    );
    await fetch(`/api/messages/${message.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
  }

  async function removeMessage(message: ChatMessage) {
    const forEveryone = message.senderId === currentUserId;
    setMessages((old) => {
      if (forEveryone) {
        return old.map((item) =>
          item.id === message.id
            ? { ...item, deletedForAll: true, body: "", mediaUrl: null }
            : item,
        );
      }
      return old.filter((item) => item.id !== message.id);
    });
    await fetch(`/api/messages/${message.id}?forEveryone=${forEveryone}`, {
      method: "DELETE",
    });
  }

  async function addMember(userId: string) {
    await fetch(`/api/conversations/${conversationId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [userId] }),
    });
    const thread = await fetch(`/api/conversations/${conversationId}`).then(
      (r) => r.json(),
    );
    setConversation(thread.conversation ?? null);
    setMemberQuery("");
    setMemberResults([]);
  }

  async function leaveGroup() {
    if (!window.confirm("Leave this group?")) return;
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    });
    if (res.ok) router.push("/messages");
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
  const peerOnline = !isGroup && peer?.presence === "ONLINE";
  const onlineCount = conversation.members.filter(
    (m) => m.userId !== currentUserId && m.user.presence === "ONLINE",
  ).length;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-2xl)] bg-[radial-gradient(circle_at_80%_0%,color-mix(in_srgb,var(--ember)_22%,transparent),transparent_34%),transparent] max-md:min-h-[min(100dvh,100%)] md:min-h-[min(560px,70dvh)]">
      <header className="surface-subtle flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] px-5 py-4 backdrop-blur-xl">
        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-tight">
            {isGroup ? <Users className="size-4 text-[var(--signal)]" /> : null}
            {name}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
            {isGroup
              ? `${conversation.members.length} members${onlineCount ? ` · ${onlineCount} online` : ""}`
              : peerOnline
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
            onClick={() => setSearchOpen((v) => !v)}
            className="icon-button size-10"
            aria-label="Search messages"
          >
            <Search className="size-4" />
          </button>
          {isGroup ? (
            <button
              type="button"
              onClick={() => setMembersOpen((v) => !v)}
              className="icon-button size-10"
              aria-label="Manage members"
            >
              <UserPlus className="size-4" />
            </button>
          ) : null}
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

      {searchOpen ? (
        <div className="border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in this chat"
              className="ps-10 pe-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="absolute end-2 top-1/2 -translate-y-1/2 icon-button size-8"
              aria-label="Close search"
            >
              <X className="size-3.5" />
            </button>
          </div>
          {searchQuery.trim() ? (
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {searching ? (
                <p className="px-1 text-xs text-[var(--muted)]">Searching…</p>
              ) : searchHits.length ? (
                searchHits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    className="block w-full rounded-[var(--radius-lg)] px-3 py-2 text-left text-sm hover:bg-[var(--mist)]/40"
                    onClick={() => {
                      document
                        .getElementById(`msg-${hit.id}`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                    }}
                  >
                    <span className="font-medium">
                      {hit.sender.displayName ??
                        hit.sender.name ??
                        hit.sender.handle}
                    </span>
                    <span className="mt-0.5 block truncate text-[var(--muted)]">
                      {hit.body || "Media message"}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-1 text-xs text-[var(--muted)]">No matches</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {membersOpen && isGroup ? (
        <div className="border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] px-5 py-3">
          <p className="text-xs font-semibold text-[var(--muted)]">Members</p>
          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-sm">
            {conversation.members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between gap-2"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      m.user.presence === "ONLINE"
                        ? "bg-[var(--signal)]"
                        : "bg-[var(--mist-strong)]"
                    }`}
                  />
                  {m.user.displayName ?? m.user.name ?? m.user.handle}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  @{m.user.handle}
                </span>
              </li>
            ))}
          </ul>
          <Input
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
            placeholder="Add people by name or @handle"
            className="mt-3"
          />
          {memberResults.length ? (
            <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
              {memberResults
                .filter(
                  (u) => !conversation.members.some((m) => m.userId === u.id),
                )
                .map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-[var(--radius-lg)] px-3 py-2 text-left text-sm hover:bg-[var(--mist)]/40"
                    onClick={() => void addMember(user.id)}
                  >
                    <span>
                      {user.displayName ?? user.name}{" "}
                      <span className="text-[var(--muted)]">
                        @{user.handle}
                      </span>
                    </span>
                    <UserPlus className="size-4" />
                  </button>
                ))}
            </div>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setMembersOpen(false)}
            >
              Done
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              onClick={() => void leaveGroup()}
            >
              <LogOut className="size-4" />
              Leave
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
        {messages.map((message) => (
          <div key={message.id} id={`msg-${message.id}`}>
            <MessageBubble
              message={message}
              mine={message.senderId === currentUserId}
              onReply={() => setReply(message)}
              onReact={(emoji) => void react(message, emoji)}
              onEdit={() => void edit(message)}
              onDelete={() => void removeMessage(message)}
            />
          </div>
        ))}
        {typingUserId ? <TypingIndicator name={typingName} /> : null}
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
