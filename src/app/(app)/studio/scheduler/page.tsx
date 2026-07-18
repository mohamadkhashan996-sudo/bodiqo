"use client";

import { useCallback, useEffect, useState } from "react";

import {
  StudioPanel,
  StudioShell,
} from "@/components/studio/studio-shell";
import { Button } from "@/components/ui/button";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Item = {
  id: string;
  type: string;
  status: string;
  preview: string;
  scheduledAt: string | null;
  views: number;
};

export default function StudioSchedulerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/content?status=SCHEDULED&limit=50");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setItems(json.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    postId: string,
    action: "publish_now" | "cancel_schedule" | "reschedule",
    scheduledAt?: string,
  ) {
    setBusy(postId);
    try {
      const res = await fetch("/api/studio/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, action, scheduledAt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <StudioShell
      title="Post scheduler"
      subtitle="Publish now, cancel, or reschedule upcoming posts."
    >
      {error ? (
        <div className="mb-4">
          <StateBanner tone="error">{error}</StateBanner>
        </div>
      ) : null}
      {loading ? <Skeleton className="h-40 rounded-[var(--radius-2xl)]" /> : null}
      {!loading ? (
        <StudioPanel title={`Scheduled (${items.length})`}>
          {!items.length ? (
            <p className="text-sm text-[var(--muted)]">
              No scheduled posts. Use the composer to schedule one.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-[var(--mist-strong)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                        {item.type}
                      </p>
                      <p className="mt-1 text-sm">
                        {item.preview || "(no caption)"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {item.scheduledAt
                          ? new Date(item.scheduledAt).toLocaleString()
                          : "No time set"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="signal"
                        disabled={busy === item.id}
                        onClick={() => void act(item.id, "publish_now")}
                      >
                        Publish now
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy === item.id}
                        onClick={() => {
                          const next = new Date(Date.now() + 2 * 60 * 60_000);
                          void act(
                            item.id,
                            "reschedule",
                            next.toISOString(),
                          );
                        }}
                      >
                        +2h
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        disabled={busy === item.id}
                        onClick={() => void act(item.id, "cancel_schedule")}
                      >
                        Cancel → draft
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </StudioPanel>
      ) : null}
    </StudioShell>
  );
}
