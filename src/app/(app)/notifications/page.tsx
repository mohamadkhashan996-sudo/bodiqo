"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";

import { useExperience } from "@/components/experience-provider";
import { PageTransition } from "@/components/motion/primitives";
import { PushOptIn } from "@/components/notifications/push-opt-in";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useSocket } from "@/hooks/use-socket";

type Note = {
  id: string;
  type: string;
  body?: string | null;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
  postId?: string | null;
  actor?: {
    handle?: string;
    image?: string | null;
    displayName?: string | null;
    name?: string | null;
  };
  post?: { id: string };
};

type FriendRequest = {
  id: string;
  kind?: "FRIEND" | "FOLLOW";
  fromUser: {
    id: string;
    handle: string | null;
    name: string | null;
    displayName: string | null;
    image: string | null;
  };
};

type OutgoingRequest = {
  id: string;
  kind?: "FRIEND" | "FOLLOW";
  toUser: {
    id: string;
    handle: string | null;
    name: string | null;
    displayName: string | null;
    image: string | null;
  };
};

export default function NotificationsPage() {
  const { t } = useExperience();
  const { socket } = useSocket();
  const [items, setItems] = useState<Note[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [filter, setFilter] = useState<
    "all" | "unread" | "social" | "mentions" | "messages" | "calls"
  >("all");
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const filterLabels = {
    all: t("notifications", "all"),
    unread: t("notifications", "unread"),
    social: t("notifications", "social"),
    mentions: t("notifications", "mentions"),
    messages: t("notifications", "messages"),
    calls: t("notifications", "calls"),
  } as const;

  const filterKeys = Object.keys(filterLabels) as Array<
    keyof typeof filterLabels
  >;
  const filterByLabel = Object.fromEntries(
    filterKeys.map((key) => [filterLabels[key], key]),
  ) as Record<string, typeof filter>;

  function loadRequests() {
    return fetch("/api/social/friend-request")
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.incoming ?? []);
        setOutgoing(d.outgoing ?? []);
      })
      .catch(() => {});
  }

  function load(reset = true) {
    if (reset) setLoading(true);
    void Promise.all([
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          setItems(d.notifications ?? []);
          setNextCursor(d.nextCursor ?? null);
        }),
      loadRequests(),
    ]).finally(() => setLoading(false));
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/notifications?cursor=${encodeURIComponent(nextCursor)}`,
      );
      const d = await res.json();
      setItems((old) => {
        const seen = new Set(old.map((n) => n.id));
        const extra = (d.notifications ?? []).filter(
          (n: Note) => !seen.has(n.id),
        );
        return [...old, ...extra];
      });
      setNextCursor(d.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onNew = (note: Note) => {
      setItems((old) => {
        const without = old.filter((item) => item.id !== note.id);
        return [note, ...without];
      });
      if (note.type === "FRIEND_REQUEST" || note.type === "FOLLOW") {
        void loadRequests();
      }
    };
    const onFriend = () => void loadRequests();
    socket?.on("notification:new", onNew);
    socket?.on("friend:update", onFriend);
    socket?.on("follow:update", onFriend);
    return () => {
      socket?.off("notification:new", onNew);
      socket?.off("friend:update", onFriend);
      socket?.off("follow:update", onFriend);
    };
  }, [socket]);

  const friendIncoming = requests.filter((r) => r.kind !== "FOLLOW");
  const followIncoming = requests.filter((r) => r.kind === "FOLLOW");
  const friendOutgoing = outgoing.filter((r) => r.kind !== "FOLLOW");
  const followOutgoing = outgoing.filter((r) => r.kind === "FOLLOW");

  const visible = items.filter((item) => {
    if (filter === "unread") return !item.readAt;
    if (filter === "mentions")
      return (
        item.type === "MENTION" ||
        item.type === "COMMENT" ||
        item.type === "REPLY"
      );
    if (filter === "social")
      return ["FOLLOW", "LIKE", "FRIEND_REQUEST", "SHARE"].includes(item.type);
    if (filter === "messages") return item.type === "MESSAGE";
    if (filter === "calls")
      return item.type === "CALL" || item.type === "MISSED_CALL";
    return true;
  });

  async function markAll() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return;
    setItems((old) =>
      old.map((x) => ({ ...x, readAt: new Date().toISOString() })),
    );
  }

  async function markOne(id: string) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    setItems((old) =>
      old.map((x) =>
        x.id === id ? { ...x, readAt: new Date().toISOString() } : x,
      ),
    );
  }

  async function removeOne(id: string) {
    const res = await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    if (!res.ok) return;
    setItems((old) => old.filter((x) => x.id !== id));
  }

  async function respond(
    requestId: string,
    status: "ACCEPTED" | "DECLINED" | "CANCELLED",
  ) {
    await fetch("/api/social/friend-request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });
    if (status === "CANCELLED") {
      setOutgoing((old) => old.filter((r) => r.id !== requestId));
    } else {
      setRequests((old) => old.filter((r) => r.id !== requestId));
    }
  }

  function hrefFor(item: Note) {
    if (item.href) return item.href;
    const postId = item.post?.id ?? item.postId;
    if (
      postId &&
      ["LIKE", "COMMENT", "REPLY", "MENTION", "SHARE"].includes(item.type)
    ) {
      return `/post/${postId}`;
    }
    if (
      item.actor?.handle &&
      ["FOLLOW", "FRIEND_REQUEST"].includes(item.type)
    ) {
      return `/u/${item.actor.handle}`;
    }
    if (item.type === "MESSAGE") return "/messages";
    if (item.type === "STORY_REPLY") return "/home";
    if (["CALL", "MISSED_CALL"].includes(item.type)) return "/calls";
    return null;
  }

  function labelFor(item: Note) {
    if (item.type === "LIKE") return "liked your post";
    if (item.type === "COMMENT") return item.body || "commented on your post";
    if (item.type === "REPLY") return item.body || "replied to a comment";
    if (item.type === "MENTION") return "mentioned you";
    if (item.type === "FOLLOW") {
      return item.body?.includes("friend")
        ? item.body
        : "started following you";
    }
    if (item.type === "FRIEND_REQUEST") {
      return item.body || "sent you a friend request";
    }
    if (item.type === "MESSAGE") return item.body || "sent you a message";
    if (item.type === "SHARE") return "shared your post";
    if (item.type === "STORY_REPLY")
      return item.body || "reacted to your story";
    if (item.type === "LIVE_STARTED") return item.body || "is live now";
    if (item.type === "LIVE_GIFT") return item.body || "sent you a gift";
    if (item.body) return item.body;
    return item.type.toLowerCase().replaceAll("_", " ");
  }

  return (
    <PageTransition className="page-shell page-stack mx-auto max-w-2xl">
      <PageHeader
        kicker="Activity"
        title={t("notifications", "title")}
        description="Likes, follows, mentions, messages, and calls — in one calm stream."
        actions={
          <Button variant="quiet" type="button" onClick={() => void markAll()}>
            {t("common", "markAllRead")}
          </Button>
        }
      />

      <PushOptIn />

      {friendIncoming.length ? (
        <Card className="mt-6 space-y-3 p-4">
          <p className="text-sm font-semibold">Friend requests</p>
          {friendIncoming.map((request) => (
            <div
              key={request.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  src={request.fromUser.image}
                  name={request.fromUser.displayName ?? request.fromUser.name}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${request.fromUser.handle}`}
                    className="truncate text-sm font-semibold hover:text-[var(--signal)]"
                  >
                    {request.fromUser.displayName ?? request.fromUser.name}
                  </Link>
                  <p className="truncate text-xs text-[var(--muted)]">
                    wants to be friends · @{request.fromUser.handle}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void respond(request.id, "ACCEPTED")}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void respond(request.id, "DECLINED")}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {followIncoming.length ? (
        <Card className="mt-6 space-y-3 p-4">
          <p className="text-sm font-semibold">Follow requests</p>
          {followIncoming.map((request) => (
            <div
              key={request.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  src={request.fromUser.image}
                  name={request.fromUser.displayName ?? request.fromUser.name}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${request.fromUser.handle}`}
                    className="truncate text-sm font-semibold hover:text-[var(--signal)]"
                  >
                    {request.fromUser.displayName ?? request.fromUser.name}
                  </Link>
                  <p className="truncate text-xs text-[var(--muted)]">
                    wants to follow you · @{request.fromUser.handle}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void respond(request.id, "ACCEPTED")}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void respond(request.id, "DECLINED")}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {friendOutgoing.length || followOutgoing.length ? (
        <Card className="mt-4 space-y-3 p-4">
          <p className="text-sm font-semibold">Outgoing requests</p>
          {[...friendOutgoing, ...followOutgoing].map((request) => (
            <div key={request.id} className="flex items-center gap-3">
              <Avatar
                src={request.toUser.image}
                name={request.toUser.displayName ?? request.toUser.name}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${request.toUser.handle}`}
                  className="text-sm font-semibold hover:text-[var(--signal)]"
                >
                  {request.toUser.displayName ?? request.toUser.name}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {request.kind === "FOLLOW"
                    ? "Follow request pending"
                    : "Friend request pending"}{" "}
                  · @{request.toUser.handle}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-9 px-3 text-xs"
                onClick={() => void respond(request.id, "CANCELLED")}
              >
                Cancel
              </Button>
            </div>
          ))}
        </Card>
      ) : null}

      <Tabs
        aria-label="Notification filters"
        items={filterKeys.map((key) => filterLabels[key])}
        value={filterLabels[filter]}
        onChange={(label) => {
          const next = filterByLabel[label];
          if (next) setFilter(next);
        }}
      />

      <div className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-20 rounded-[var(--radius-xl)]" />
            <Skeleton className="h-20 rounded-[var(--radius-xl)]" />
            <Skeleton className="h-20 rounded-[var(--radius-xl)]" />
          </>
        ) : (
          visible.map((item) => {
            const href = hrefFor(item);
            const inner = (
              <>
                <Avatar
                  src={item.actor?.image}
                  name={item.actor?.displayName ?? item.actor?.name ?? "Relune"}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6">
                    <span className="font-semibold">
                      {item.actor?.displayName ?? item.actor?.name ?? "Someone"}
                    </span>{" "}
                    {labelFor(item)}
                  </p>
                  <time className="text-xs text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </div>
                <button
                  type="button"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                  aria-label={t("common", "delete")}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void removeOne(item.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            );
            const className = `flex gap-3 rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] p-4 transition-[background-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)] ${
              item.readAt
                ? "bg-[var(--cloud-elevated)]"
                : "bg-[var(--surface)] shadow-[var(--shadow-sm)]"
            }`;
            return href ? (
              <Link
                key={item.id}
                href={href}
                className={className}
                onClick={() => {
                  if (!item.readAt) void markOne(item.id);
                }}
              >
                {inner}
              </Link>
            ) : (
              <article key={item.id} className={className}>
                {inner}
              </article>
            );
          })
        )}
        {!loading && nextCursor ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? t("common", "loading") : "Load more"}
          </Button>
        ) : null}
        {!loading && !visible.length && !requests.length ? (
          <EmptyState
            icon={<Bell className="size-6" />}
            title={t("notifications", "empty")}
            description={t("empty", "notifications")}
          />
        ) : null}
      </div>
    </PageTransition>
  );
}
