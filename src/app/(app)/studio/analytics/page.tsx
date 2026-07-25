"use client";

import { useEffect, useState } from "react";

import {
  fmt,
  StudioPanel,
  StudioShell,
  StudioSpark,
  StudioStat,
} from "@/components/studio/studio-shell";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Analytics = {
  rangeDays: number;
  totals: {
    posts: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    videoViews: number;
    walletCoins: number;
    giftCoinsInRange: number;
    newFollowersInRange: number;
  };
  series: {
    views: Array<{ date: string; value: number }>;
    followers: Array<{ date: string; value: number }>;
    giftCoins: Array<{ date: string; value: number }>;
  };
  topPosts: Array<{
    id: string;
    type: string;
    preview: string;
    views: number;
    likes: number;
    comments: number;
  }>;
  topSupporters: Array<{
    userId: string;
    handle: string;
    name: string;
    gifts: number;
    coins: number;
  }>;
};

export default function StudioAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/studio/analytics?days=${days}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setData(json);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <StudioShell
      title="Analytics"
      subtitle="Views, audience growth, and gift activity for your content."
      actions={
        <select
          className="rounded-full border border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-2 text-sm"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      }
    >
      {loading && !data ? (
        <Skeleton className="h-40 rounded-[var(--radius-2xl)]" />
      ) : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StudioStat label="Views" value={fmt(data.totals.views)} />
            <StudioStat
              label="Video views"
              value={fmt(data.totals.videoViews)}
            />
            <StudioStat
              label="New followers"
              value={fmt(data.totals.newFollowersInRange)}
            />
            <StudioStat
              label="Gift coins"
              value={fmt(data.totals.giftCoinsInRange)}
            />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <StudioPanel title="Views / day">
              <StudioSpark series={data.series.views} />
            </StudioPanel>
            <StudioPanel title="Followers / day">
              <StudioSpark series={data.series.followers} />
            </StudioPanel>
            <StudioPanel title="Gift coins / day">
              <StudioSpark series={data.series.giftCoins} />
            </StudioPanel>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <StudioPanel title="Top posts">
              <ul className="space-y-2 text-sm">
                {data.topPosts.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {p.type}
                      {p.preview ? ` · ${p.preview}` : ""}
                    </span>
                    <span className="shrink-0">
                      {fmt(p.views)} views · {fmt(p.likes)} likes
                    </span>
                  </li>
                ))}
                {!data.topPosts.length ? (
                  <li className="text-[var(--muted)]">No posts yet</li>
                ) : null}
              </ul>
            </StudioPanel>
            <StudioPanel title="Top gift supporters">
              <ul className="space-y-2 text-sm">
                {data.topSupporters.map((s) => (
                  <li key={s.userId} className="flex justify-between gap-3">
                    <span className="truncate">@{s.handle}</span>
                    <span className="shrink-0">
                      {fmt(s.coins)} coins · {s.gifts} gifts
                    </span>
                  </li>
                ))}
                {!data.topSupporters.length ? (
                  <li className="text-[var(--muted)]">No gifts in range</li>
                ) : null}
              </ul>
            </StudioPanel>
          </div>
        </>
      ) : null}
    </StudioShell>
  );
}
