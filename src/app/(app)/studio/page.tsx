"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  fmt,
  StudioPanel,
  StudioShell,
  StudioStat,
} from "@/components/studio/studio-shell";
import { Card, Skeleton, StateBanner } from "@/components/ui/card";

type Dashboard = {
  profile: {
    handle: string | null;
    displayName: string | null;
    name: string | null;
    isVerified: boolean;
  };
  counts: {
    published: number;
    drafts: number;
    scheduled: number;
    archived: number;
    videos: number;
    followers: number;
    views7: number;
    views30: number;
    newFollowers7: number;
    openReports: number;
    liveMods: number;
    communitiesOwned: number;
  };
  monetization: {
    walletCoins: number;
    giftCoins30d: number;
    giftEvents30d: number;
  };
  verification: {
    isVerified: boolean;
    pending: { id: string; status: string; category: string } | null;
  };
  links: {
    composer: string;
    live: string;
    shortsUpload: string;
    verification: string;
  };
};

export default function StudioDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/studio")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setData(json);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudioShell
      title="Dashboard"
      subtitle="Your creator overview — content, audience, gifts, and tools."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/home"
            className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-[var(--signal-deep)] bg-[var(--signal-deep)] px-5 text-sm font-semibold text-white"
          >
            New post
          </Link>
          <Link
            href="/live/go"
            className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-5 text-sm font-semibold"
          >
            Go live
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
          <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
          <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
          <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
        </div>
      ) : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {data ? (
        <>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Signed in as @
            {data.profile.handle ||
              data.profile.displayName ||
              data.profile.name ||
              "creator"}
            {data.verification.isVerified ? " · Verified" : ""}
            {data.verification.pending
              ? ` · Verification ${data.verification.pending.status.toLowerCase()}`
              : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StudioStat label="Followers" value={fmt(data.counts.followers)} />
            <StudioStat
              label="Views (7d)"
              value={fmt(data.counts.views7)}
              hint={`${fmt(data.counts.views30)} in 30d`}
            />
            <StudioStat
              label="Published"
              value={fmt(data.counts.published)}
              hint={`${data.counts.videos} videos · ${data.counts.drafts} drafts`}
            />
            <StudioStat
              label="Gift coins (30d)"
              value={fmt(data.monetization.giftCoins30d)}
              hint={`${fmt(data.monetization.walletCoins)} wallet`}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <StudioPanel title="Content pipeline">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <Link href="/studio/scheduler" className="hover:underline">
                    Scheduled
                  </Link>
                  <span>{data.counts.scheduled}</span>
                </li>
                <li className="flex justify-between">
                  <Link href="/studio/posts" className="hover:underline">
                    Drafts
                  </Link>
                  <span>{data.counts.drafts}</span>
                </li>
                <li className="flex justify-between">
                  <Link href="/studio/videos" className="hover:underline">
                    Videos & shorts
                  </Link>
                  <span>{data.counts.videos}</span>
                </li>
                <li className="flex justify-between">
                  <Link href="/studio/content" className="hover:underline">
                    Archived
                  </Link>
                  <span>{data.counts.archived}</span>
                </li>
              </ul>
            </StudioPanel>
            <StudioPanel title="Audience & trust">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>New followers (7d)</span>
                  <span>{fmt(data.counts.newFollowers7)}</span>
                </li>
                <li className="flex justify-between">
                  <Link href="/studio/reports" className="hover:underline">
                    Open reports
                  </Link>
                  <span>{data.counts.openReports}</span>
                </li>
                <li className="flex justify-between">
                  <Link href="/studio/collab" className="hover:underline">
                    Communities owned
                  </Link>
                  <span>{data.counts.communitiesOwned}</span>
                </li>
                <li className="flex justify-between">
                  <Link
                    href="/settings/verification"
                    className="hover:underline"
                  >
                    Verification
                  </Link>
                  <span>
                    {data.verification.isVerified ? "Verified" : "Not verified"}
                  </span>
                </li>
              </ul>
            </StudioPanel>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["/studio/analytics", "Analytics"],
                ["/studio/monetization", "Monetization"],
                ["/studio/music", "Music library"],
                ["/studio/copyright", "Copyright"],
              ] as const
            ).map(([href, label]) => (
              <Card key={href} className="p-4">
                <Link href={href} className="text-sm font-medium hover:underline">
                  {label} →
                </Link>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </StudioShell>
  );
}
