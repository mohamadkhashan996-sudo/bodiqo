"use client";

import Link from "next/link";
import { Archive, BellOff, Pin, Search } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function messagePreviewLabel(message?: {
  body?: string | null;
  type?: string;
  isEncrypted?: boolean;
}) {
  if (!message) return "No messages yet";
  if (message.isEncrypted) return "Encrypted message";
  const body = message.body?.trim();
  if (body) return body;
  switch (message.type) {
    case "IMAGE":
      return "Photo";
    case "VIDEO":
      return "Video";
    case "AUDIO":
      return "Voice note";
    case "FILE":
    case "DOCUMENT":
      return "File";
    default:
      return "New message";
  }
}

export type ConversationRow = {
  conversationId: string;
  conversation: {
    id: string;
    type: string;
    title: string | null;
    image: string | null;
    members: {
      userId: string;
      user: {
        name: string | null;
        displayName: string | null;
        handle: string | null;
        image: string | null;
        presence: string;
      };
    }[];
    messages: {
      body: string;
      createdAt: string;
      type?: string;
      isEncrypted?: boolean;
      mediaUrl?: string | null;
    }[];
  };
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
};

export type MessageSearchHit = {
  id: string;
  body: string;
  conversationId: string;
  createdAt: string;
  sender: {
    displayName?: string | null;
    name: string | null;
    handle: string | null;
  };
};

export function conversationName(row: ConversationRow, currentUserId?: string) {
  const other = row.conversation.members.find(
    (member) => member.userId !== currentUserId,
  );
  return (
    row.conversation.title ??
    other?.user.displayName ??
    other?.user.name ??
    other?.user.handle ??
    "Untitled conversation"
  );
}

export function ConversationList({
  conversations,
  activeId,
  query,
  onQuery,
  currentUserId,
  messageHits = [],
  searchingMessages = false,
  inbox = "chats",
  onInbox,
}: {
  conversations: ConversationRow[];
  activeId?: string;
  query: string;
  onQuery: (query: string) => void;
  currentUserId?: string;
  messageHits?: MessageSearchHit[];
  searchingMessages?: boolean;
  inbox?: "chats" | "requests" | "archived";
  onInbox?: (inbox: "chats" | "requests" | "archived") => void;
}) {
  const rows = conversations.filter((row) =>
    conversationName(row, currentUserId)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const showMessageHits = query.trim().length >= 2;

  return (
    <aside className="surface-subtle flex h-full min-h-[min(70dvh,28rem)] w-full flex-col rounded-[var(--radius-2xl)] border-2 border-[var(--mist-strong)] md:min-h-[560px] md:w-[22rem] md:max-w-[22rem] md:shrink-0">
      <div className="border-b-2 border-[var(--mist-strong)] p-4 sm:p-5">
        <p className="text-[11px] font-bold tracking-[.22em] text-[var(--signal-deep)] uppercase">
          Private circle
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
          Messages
        </h1>
        {onInbox ? (
          <div className="mt-4 flex gap-1 rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] p-1">
            {(
              [
                ["chats", "Chats"],
                ["requests", "Requests"],
                ["archived", "Archived"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onInbox(key)}
                className={`flex-1 rounded-[var(--radius-lg)] px-2 py-2 text-xs font-semibold transition ${
                  inbox === key
                    ? "bg-[var(--ink)] text-[var(--cloud)]"
                    : "text-[var(--muted)] hover:bg-[var(--mist)]/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <label className="mt-5 block">
          <span className="sr-only">Find a conversation or message</span>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Find chats or messages"
              className="pl-10"
            />
          </div>
        </label>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pt-3 pb-4">
        {showMessageHits ? (
          <div className="mb-3 space-y-1">
            <p className="px-2 text-[10px] font-bold tracking-[0.16em] text-[var(--muted)] uppercase">
              Messages
            </p>
            {searchingMessages ? (
              <p className="px-2 text-xs text-[var(--muted)]">Searching…</p>
            ) : messageHits.length ? (
              messageHits.slice(0, 8).map((hit) => (
                <Link
                  key={hit.id}
                  href={`/messages/${hit.conversationId}`}
                  className="block rounded-[var(--radius-xl)] px-3 py-2 text-xs transition hover:bg-[var(--mist)]/40"
                >
                  <p className="font-semibold text-[var(--signal)]">
                    {hit.sender.displayName ??
                      hit.sender.name ??
                      hit.sender.handle}
                  </p>
                  <p className="mt-0.5 truncate text-[var(--muted)]">
                    {hit.body || "Media message"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="px-2 text-xs text-[var(--muted)]">
                No message matches
              </p>
            )}
            <p className="mt-3 px-2 text-[10px] font-bold tracking-[0.16em] text-[var(--muted)] uppercase">
              Conversations
            </p>
          </div>
        ) : null}
        {rows.map((row) => {
          const member = row.conversation.members.find(
            (item) =>
              item.userId !== currentUserId && item.user.presence === "ONLINE",
          )?.user;
          const latest = row.conversation.messages[0];
          return (
            <Link
              key={row.conversationId}
              href={`/messages/${row.conversation.id}`}
              className={`block rounded-[var(--radius-xl)] p-3 transition-[transform,background-color,color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                activeId === row.conversation.id
                  ? "bg-[var(--ink)] text-white shadow-[var(--shadow-md)]"
                  : "surface-panel hover:-translate-y-0.5 hover:text-[var(--ink)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar
                    src={row.conversation.image}
                    name={conversationName(row, currentUserId)}
                    className="size-11 rounded-[1rem]"
                  />
                  {member ? (
                    <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[var(--surface)] bg-[var(--signal)]" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-bold">
                      {conversationName(row, currentUserId)}
                    </p>
                    {row.isPinned ? (
                      <Pin className="size-3 opacity-60" />
                    ) : null}
                    {row.isMuted ? (
                      <BellOff className="size-3 opacity-60" />
                    ) : null}
                    {row.isArchived ? (
                      <Archive className="size-3 opacity-60" />
                    ) : null}
                  </div>
                  <p
                    className={`mt-1 truncate text-xs ${
                      activeId === row.conversation.id
                        ? "text-white/90"
                        : "text-[var(--muted-strong)]"
                    }`}
                  >
                    {messagePreviewLabel(latest)}
                  </p>
                </div>
                {row.unreadCount > 0 ? (
                  <span className="grid size-5 place-items-center rounded-full bg-[var(--signal)] text-[10px] font-bold text-white">
                    {row.unreadCount}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
        {!rows.length ? (
          <EmptyState
            title={
              inbox === "requests"
                ? "No message requests"
                : inbox === "archived"
                  ? "No archived chats"
                  : "Your circle is quiet for now"
            }
            description={
              inbox === "requests"
                ? "When someone new messages you, it’ll show up here."
                : inbox === "archived"
                  ? "Archive a chat from the thread header."
                  : "New conversations and replies will appear here."
            }
            className="px-4 py-10"
          />
        ) : null}
      </div>
    </aside>
  );
}
