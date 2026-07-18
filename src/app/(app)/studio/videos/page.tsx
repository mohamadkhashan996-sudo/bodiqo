"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  StudioPanel,
  StudioShell,
  fmt,
} from "@/components/studio/studio-shell";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Video = {
  id: string;
  type: string;
  status: string;
  preview: string;
  views: number;
  likes: number;
  comments: number;
  duration: number | null;
  thumb: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
};

export default function StudioVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/studio/videos")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setVideos(json.videos ?? []);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudioShell
      title="Video manager"
      subtitle="Videos and shorts across published, draft, scheduled, and archived."
      actions={
        <Link
          href="/shorts"
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Upload short →
        </Link>
      }
    >
      {loading ? <Skeleton className="h-40 rounded-[var(--radius-2xl)]" /> : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {!loading && !error ? (
        <StudioPanel title={`${videos.length} videos`}>
          {!videos.length ? (
            <p className="text-sm text-[var(--muted)]">No videos yet.</p>
          ) : (
            <ul className="space-y-3">
              {videos.map((v) => (
                <li
                  key={v.id}
                  className="flex gap-3 rounded-2xl border border-[var(--mist-strong)] p-3"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[var(--mist)]">
                    {v.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumb}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                      {v.type} · {v.status}
                    </p>
                    <p className="mt-1 truncate text-sm">
                      {v.preview || "(no caption)"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {fmt(v.views)} views · {fmt(v.likes)} likes ·{" "}
                      {fmt(v.comments)} comments
                      {v.duration != null
                        ? ` · ${Math.round(v.duration)}s`
                        : ""}
                    </p>
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
