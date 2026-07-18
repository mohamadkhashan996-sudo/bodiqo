"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Bell,
  BellOff,
  Lock,
  LogOut,
  Phone,
  Pin,
  Search,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/hooks/use-socket";
import { dispatchCallStart } from "@/lib/call-events";
import {
  encryptForPeer,
  ensureIdentityKeys,
  fetchPeerPublicKey,
} from "@/lib/e2e-crypto";
import { emitAck } from "@/lib/socket-client";

import { type ChatMessage, MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { TypingIndicator } from "./typing-indicator";

type Conversation = {
  id: string;
  title: string | null;
  type: string;
  membership?: {
    isPinned?: boolean;
    isMuted?: boolean;
    isArchived?: boolean;
    isFavorite?: boolean;
    isRequest?: boolean;
    unreadCount?: number;
  };
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

const TYPING_CLEAR_MS = 3500;

export function ChatThread({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { socket } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(
    () => new Map(),
  );
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
  const [muted, setMuted] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [isRequest, setIsRequest] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    void ensureIdentityKeys()
      .then(() => setE2eReady(true))
      .catch(() => setE2eReady(false));
  }, []);

  useEffect(() => {
    const timers = typingTimers.current;
    socket?.emit("conversation:join", { conversationId });
    setMessages([]);
    setNextCursor(null);
    void Promise.all([
      fetch(`/api/conversations/${conversationId}`).then((r) => r.json()),
      fetch(`/api/conversations/${conversationId}/messages?limit=40`).then(
        (r) => r.json(),
      ),
    ]).then(([thread, history]) => {
      setConversation(thread.conversation ?? null);
      setMuted(Boolean(thread.conversation?.membership?.isMuted));
      setPinned(Boolean(thread.conversation?.membership?.isPinned));
      setArchived(Boolean(thread.conversation?.membership?.isArchived));
      setIsRequest(Boolean(thread.conversation?.membership?.isRequest));
      setMessages(history.messages ?? []);
      setNextCursor(history.nextCursor ?? null);
      socket?.emit("message:seen", { conversationId });
      socket?.emit("message:delivered", { conversationId });
    });
    return () => {
      socket?.emit("conversation:leave", { conversationId });
      socket?.emit("typing:stop", { conversationId });
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      setTypingUsers(new Map());
    };
  }, [conversationId, socket]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages?cursor=${nextCursor}&limit=40`,
      );
      const data = await res.json();
      if (!res.ok) return;
      const older = (data.messages ?? []) as ChatMessage[];
      setMessages((old) => {
        const ids = new Set(old.map((m) => m.id));
        return [...older.filter((m) => !ids.has(m.id)), ...old];
      });
      setNextCursor(data.nextCursor ?? null);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, nextCursor, loadingOlder]);

  useEffect(() => {
    const el = topSentinel.current;
    if (!el || !nextCursor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadOlder();
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, loadOlder]);

  function bumpTypingUser(userId: string) {
    setTypingUsers((prev) => {
      const next = new Map(prev);
      next.set(userId, Date.now());
      return next;
    });
    const existing = typingTimers.current.get(userId);
    if (existing) clearTimeout(existing);
    typingTimers.current.set(
      userId,
      setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
        typingTimers.current.delete(userId);
      }, TYPING_CLEAR_MS),
    );
  }

  function clearTypingUser(userId?: string) {
    if (!userId) {
      setTypingUsers(new Map());
      for (const timer of typingTimers.current.values()) clearTimeout(timer);
      typingTimers.current.clear();
      return;
    }
    setTypingUsers((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
    const timer = typingTimers.current.get(userId);
    if (timer) clearTimeout(timer);
    typingTimers.current.delete(userId);
  }

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
        bumpTypingUser(userId);
      }
    };
    const stop = ({
      conversationId: id,
      userId,
    }: {
      conversationId: string;
      userId?: string;
    }) => {
      if (id === conversationId) clearTypingUser(userId);
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
                  !(r.userId === reaction.userId && r.emoji === reaction.emoji),
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
  }, [messages.length, typingUsers.size]);

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

  const typingNames = useMemo(() => {
    if (!conversation || !typingUsers.size) return [];
    return [...typingUsers.keys()]
      .map((userId) => {
        const member = conversation.members.find(
          (m) => m.userId === userId,
        )?.user;
        return (
          member?.displayName ?? member?.name ?? member?.handle ?? "Someone"
        );
      })
      .filter(Boolean);
  }, [conversation, typingUsers]);

  async function toggleFlag(flag: "isMuted" | "isPinned" | "isArchived") {
    const next =
      flag === "isMuted"
        ? !muted
        : flag === "isPinned"
          ? !pinned
          : !archived;
    if (flag === "isMuted") setMuted(next);
    if (flag === "isPinned") setPinned(next);
    if (flag === "isArchived") setArchived(next);
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [flag]: next }),
    });
    if (flag === "isArchived" && next) router.push("/messages");
  }

  async function respondRequest(action: "accept_request" | "decline_request") {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    if (action === "decline_request") {
      router.push("/messages");
      return;
    }
    setIsRequest(false);
  }

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
        window.alert(
          "Couldn’t encrypt this message. It was not sent. Try again.",
        );
        return;
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

  async function invite(type: "AUDIO" | "VIDEO") {
    if (conversation?.type === "GROUP") {
      window.alert(
        "Group calls aren’t available yet. Open a direct chat to call someone.",
      );
      return;
    }
    const callees = peer ? [peer.id] : [];
    if (!callees.length || !socket) return;
    const result = await emitAck(socket, "call:invite", {
      conversationId,
      calleeIds: callees,
      type,
    });
    if (!result.ok) {
      window.alert(result.error || "Could not start the call");
      return;
    }
    if (result.data) dispatchCallStart(result.data);
  }

  async function edit(message: ChatMessage) {
    if (message.isEncrypted) {
      window.alert("Encrypted messages can’t be edited yet.");
      return;
    }
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
            ? item.reactions.filter(
                (r) => !(r.userId === currentUserId && r.emoji === emoji),
              )
            : [...item.reactions, { emoji, userId: currentUserId }],
        };
      }),
    );
    const exists = message.reactions.some(
      (r) => r.userId === currentUserId && r.emoji === emoji,
    );
    await fetch(
      exists
        ? `/api/messages/${message.id}/react?emoji=${encodeURIComponent(emoji)}`
        : `/api/messages/${message.id}/react`,
      {
        method: exists ? "DELETE" : "POST",
        headers: exists
          ? undefined
          : { "Content-Type": "application/json" },
        body: exists ? undefined : JSON.stringify({ emoji }),
      },
    );
  }

  async function removeMessage(message: ChatMessage) {
    let forEveryone = false;
    if (message.senderId === currentUserId) {
      forEveryone = window.confirm(
        "Delete for everyone?\n\nOK = delete for everyone\nCancel = delete only for you",
      );
    }
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

  async function copyMessage(message: ChatMessage) {
    const text = message.isEncrypted ? "" : message.body;
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  async function forwardMessage(message: ChatMessage) {
    if (message.isEncrypted) {
      window.alert("Encrypted messages can’t be forwarded.");
      return;
    }
    const list = await fetch("/api/conversations")
      .then((r) => r.json())
      .catch(() => ({ conversations: [] }));
    const options = (list.conversations ?? []) as Array<{
      conversationId: string;
      conversation: { id: string; title: string | null; type: string };
    }>;
    const targets = options.filter((row) => row.conversationId !== conversationId);
    if (!targets.length) {
      window.alert("No other chats to forward to.");
      return;
    }
    const labels = targets.map((row, i) => {
      const title =
        row.conversation.title ||
        (row.conversation.type === "GROUP" ? "Group" : "Chat");
      return `${i + 1}. ${title}`;
    });
    const pick = window.prompt(
      `Forward to which chat?\n${labels.join("\n")}\n\nEnter a number`,
    );
    const idx = Number(pick) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= targets.length) return;
    const targetId = targets[idx]!.conversationId;
    await fetch(`/api/messages/${message.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forward", conversationId: targetId }),
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
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-2xl)] bg-[radial-gradient(circle_at_80%_0%,color-mix(in_srgb,var(--ember)_22%,transparent),transparent_34%),transparent] md:min-h-[min(560px,70dvh)]">
      <header className="surface-subtle flex items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 truncate font-[family-name:var(--font-display)] text-lg tracking-tight sm:text-xl">
            {isGroup ? (
              <Users className="size-4 shrink-0 text-[var(--signal)]" />
            ) : null}
            <span className="truncate">{name}</span>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
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
        <div className="flex shrink-0 gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => void toggleFlag("isMuted")}
            className="icon-button size-11 touch-manipulation sm:size-10"
            aria-label={muted ? "Unmute chat" : "Mute chat"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <BellOff className="size-4" />
            ) : (
              <Bell className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => void toggleFlag("isPinned")}
            className={`icon-button size-11 touch-manipulation sm:size-10 ${pinned ? "text-[var(--signal-deep)]" : ""}`}
            aria-label={pinned ? "Unpin chat" : "Pin chat"}
            title={pinned ? "Unpin" : "Pin"}
          >
            <Pin className="size-4" fill={pinned ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={() => void toggleFlag("isArchived")}
            className={`icon-button size-11 touch-manipulation sm:size-10 ${archived ? "text-[var(--signal-deep)]" : ""}`}
            aria-label={archived ? "Unarchive chat" : "Archive chat"}
            title={archived ? "Unarchive" : "Archive"}
          >
            <Archive className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="icon-button size-11 touch-manipulation sm:size-10"
            aria-label="Search messages"
          >
            <Search className="size-4" />
          </button>
          {isGroup ? (
            <button
              type="button"
              onClick={() => setMembersOpen((v) => !v)}
              className="icon-button size-11 touch-manipulation sm:size-10"
              aria-label="Manage members"
            >
              <UserPlus className="size-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => invite("AUDIO")}
                className="icon-button size-11 touch-manipulation sm:size-10"
                aria-label="Voice call"
              >
                <Phone className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => invite("VIDEO")}
                className="icon-button size-11 touch-manipulation sm:size-10"
                aria-label="Video call"
              >
                <Video className="size-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {isRequest ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] px-5 py-3">
          <p className="text-sm text-[var(--muted)]">
            Message request — accept to move this chat into your inbox.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void respondRequest("accept_request")}
            >
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void respondRequest("decline_request")}
            >
              Decline
            </Button>
          </div>
        </div>
      ) : null}

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
              className="icon-button absolute end-2 top-1/2 size-8 -translate-y-1/2"
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
                      document.getElementById(`msg-${hit.id}`)?.scrollIntoView({
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

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6">
        <div ref={topSentinel} className="h-1" />
        {nextCursor || loadingOlder ? (
          <p className="text-center text-xs text-[var(--muted)]">
            {loadingOlder
              ? "Loading earlier messages…"
              : "Scroll up for earlier messages"}
          </p>
        ) : null}
        {messages.map((message) => (
          <div key={message.id} id={`msg-${message.id}`}>
            <MessageBubble
              message={message}
              mine={message.senderId === currentUserId}
              showReceipts={!isGroup}
              onReply={() => setReply(message)}
              onReact={(emoji) => void react(message, emoji)}
              onEdit={() => void edit(message)}
              onDelete={() => void removeMessage(message)}
              onCopy={() => void copyMessage(message)}
              onForward={() => void forwardMessage(message)}
            />
          </div>
        ))}
        {typingNames.length ? (
          <TypingIndicator
            name={
              typingNames.length === 1
                ? typingNames[0]
                : `${typingNames.length} people`
            }
          />
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
