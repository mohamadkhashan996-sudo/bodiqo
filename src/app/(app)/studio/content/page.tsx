"use client";

import { useCallback, useEffect, useState } from "react";

import {
  StudioPanel,
  StudioShell,
  fmt,
} from "@/components/studio/studio-shell";
import { Button } from "@/components/ui/button";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Item = {
  id: string;
  type: string;
  status: string;
  preview: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

const STATUSES = ["ALL", "PUBLISHED", "DRAFT", "SCHEDULED", "ARCHIVED"] as const;
const TYPES = ["ALL", "TEXT", "IMAGE", "VIDEO", "SHORT", "POLL", "LINK", "REPOST"] as const;

export default function StudioContentPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [type, setType] = useState<(typeof TYPES)[number]>("ALL");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/studio/content?status=${status}&type=${type}&limit=60`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setItems(json.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <StudioShell
      title="Content manager"
      subtitle="Filter and review all of your posts by status and type."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={status === s ? "signal" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s}
          </Button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={type === t ? "solid" : "quiet"}
            onClick={() => setType(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {loading ? <Skeleton className="h-40 rounded-[var(--radius-2xl)]" /> : null}
      {!loading ? (
        <StudioPanel title={`${items.length} items`}>
          <ul className="space-y-3 text-sm">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--mist-strong)] p-3"
              >
                <div className="min-w-0">
                  <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                    {item.type} · {item.status}
                  </p>
                  <p className="mt-1">{item.preview || "(no caption)"}</p>
                </div>
                <div className="shrink-0 text-xs text-[var(--muted)]">
                  {fmt(item.views)} views · {fmt(item.likes)} likes
                </div>
              </li>
            ))}
            {!items.length ? (
              <li className="text-[var(--muted)]">No content for this filter</li>
            ) : null}
          </ul>
        </StudioPanel>
      ) : null}
    </StudioShell>
  );
}
