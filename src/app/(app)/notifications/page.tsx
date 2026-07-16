"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, Card } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";
import { useExperience } from "@/components/experience-provider";

type Note = {
  id: string;
  type: string;
  body?: string | null;
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
  const [items, setItems] = useState<Note[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "social" | "mentions">("all");

  function load() {
    void fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []));
    void fetch("/api/social/friend-request")
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.incoming ?? []);
        setOutgoing(d.outgoing ?? []);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  const visible = items.filter((item) => {
    if (filter === "unread") return !item.readAt;
    if (filter === "mentions") return item.type.includes("MENTION") || item.type.includes("COMMENT");
    if (filter === "social")
      return ["FOLLOW", "LIKE", "FRIEND_REQUEST", "CALL", "MISSED_CALL"].includes(item.type);
    return true;
  });

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setItems((old) => old.map((x) => ({ ...x, readAt: new Date().toISOString() })));
  }

  async function respond(requestId: string, status: "ACCEPTED" | "DECLINED" | "CANCELLED") {
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
    const postId = item.post?.id ?? item.postId;
    if (postId && ["LIKE", "COMMENT", "REPLY", "MENTION"].includes(item.type)) {
      return `/post/${postId}`;
    }
    if (item.actor?.handle && ["FOLLOW", "FRIEND_REQUEST"].includes(item.type)) {
      return `/u/${item.actor.handle}`;
    }
    if (["CALL", "MISSED_CALL"].includes(item.type)) return "/calls";
    return null;
  }

  return (
    <PageTransition className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
            Activity
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            {t("notifications", "title")}
          </h1>
        </div>
        <Button variant="quiet" type="button" onClick={() => void markAll()}>
          {t("common", "markAllRead")}
        </Button>
      </div>

      {requests.length ? (
        <Card className="mt-6 space-y-3 p-4">
          <p className="text-sm font-semibold">Follow requests</p>
          {requests.map((request) => (
            <div key={request.id} className="flex items-center gap-3">
              <Avatar
                src={request.fromUser.image}
                name={request.fromUser.displayName ?? request.fromUser.name}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${request.fromUser.handle}`}
                  className="text-sm font-semibold hover:text-[var(--signal)]"
                >
                  {request.fromUser.displayName ?? request.fromUser.name}
                </Link>
                <p className="text-xs text-[var(--muted)]">@{request.fromUser.handle}</p>
              </div>
              <Button
                type="button"
                className="min-h-9 px-3 text-xs"
                onClick={() => void respond(request.id, "ACCEPTED")}
              >
                Accept
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-9 px-3 text-xs"
                onClick={() => void respond(request.id, "DECLINED")}
              >
                Decline
              </Button>
            </div>
          ))}
        </Card>
      ) : null}

      {outgoing.length ? (
        <Card className="mt-4 space-y-3 p-4">
          <p className="text-sm font-semibold">Outgoing requests</p>
          {outgoing.map((request) => (
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
                <p className="text-xs text-[var(--muted)]">@{request.toUser.handle}</p>
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

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Notification filters">
        {(
          [
            ["all", t("notifications", "all")],
            ["unread", t("notifications", "unread")],
            ["social", t("notifications", "social")],
            ["mentions", t("notifications", "mentions")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-wide transition ${
              filter === key
                ? "bg-[var(--ink)] text-[var(--cloud)]"
                : "border border-[var(--mist)] text-[var(--muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-7 space-y-3">
        {visible.map((item) => {
          const href = hrefFor(item);
          const inner = (
            <>
              <Avatar
                src={item.actor?.image}
                name={item.actor?.displayName ?? item.actor?.name ?? "Relune"}
              />
              <div>
                <p className="text-sm">
                  <b>{item.actor?.displayName ?? item.actor?.name ?? "Someone"}</b>{" "}
                  {item.body ?? item.type.toLowerCase().replaceAll("_", " ")}
                </p>
                <time className="text-xs text-[var(--muted)]">
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </div>
            </>
          );
          return href ? (
            <Link
              key={item.id}
              href={href}
              className={`flex gap-3 rounded-2xl border border-[var(--mist)] p-4 transition hover:bg-[var(--surface)] ${
                item.readAt ? "bg-[var(--glass)]" : "bg-white/80 shadow-sm dark:bg-white/5"
              }`}
            >
              {inner}
            </Link>
          ) : (
            <article
              key={item.id}
              className={`flex gap-3 rounded-2xl border border-[var(--mist)] p-4 transition ${
                item.readAt ? "bg-[var(--glass)]" : "bg-white/80 shadow-sm dark:bg-white/5"
              }`}
            >
              {inner}
            </article>
          );
        })}
        {!visible.length && !requests.length ? (
          <EmptyState
            title={t("notifications", "empty")}
            description={t("empty", "notifications")}
            action={<Bell className="mx-auto size-5 text-[var(--muted)]" aria-hidden />}
          />
        ) : null}
      </div>
    </PageTransition>
  );
}
