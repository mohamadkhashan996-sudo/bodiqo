"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";
import { useExperience } from "@/components/experience-provider";

type Note = {
  id: string;
  type: string;
  body?: string | null;
  readAt?: string | null;
  createdAt: string;
  actor?: { image?: string | null; displayName?: string | null; name?: string | null };
};

export default function NotificationsPage() {
  const { t } = useExperience();
  const [items, setItems] = useState<Note[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "social" | "mentions">("all");

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []))
      .catch(() => {});
  }, []);

  const visible = useMemo(() => {
    return items.filter((item) => {
      if (filter === "unread") return !item.readAt;
      if (filter === "mentions") return item.type.includes("MENTION") || item.type.includes("COMMENT");
      if (filter === "social") return ["FOLLOW", "LIKE", "FRIEND_REQUEST"].includes(item.type);
      return true;
    });
  }, [items, filter]);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setItems((old) => old.map((x) => ({ ...x, readAt: new Date().toISOString() })));
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
        {visible.map((item) => (
          <article
            key={item.id}
            className={`flex gap-3 rounded-2xl border border-[var(--mist)] p-4 transition ${
              item.readAt ? "bg-[var(--glass)]" : "bg-white/80 shadow-sm dark:bg-white/5"
            }`}
          >
            <Avatar
              src={item.actor?.image}
              name={item.actor?.displayName ?? item.actor?.name ?? "Relune"}
            />
            <div>
              <p className="text-sm">
                <b>{item.actor?.displayName ?? "Someone"}</b>{" "}
                {item.body ?? item.type.toLowerCase().replaceAll("_", " ")}
              </p>
              <time className="text-xs text-[var(--muted)]">
                {new Date(item.createdAt).toLocaleString()}
              </time>
            </div>
          </article>
        ))}
        {!visible.length ? (
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
