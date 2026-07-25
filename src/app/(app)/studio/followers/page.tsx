"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  fmt,
  StudioPanel,
  StudioShell,
  StudioStat,
} from "@/components/studio/studio-shell";
import { Skeleton, StateBanner } from "@/components/ui/card";

type FollowersPayload = {
  handle: string | null;
  followersCount: number;
  followingCount: number;
  newFollowers7d: number;
  followers: Array<{
    id: string;
    handle: string | null;
    displayName: string | null;
    name: string | null;
    image: string | null;
    isVerified: boolean;
    followersCount: number;
    followedAt: string;
  }>;
};

export default function StudioFollowersPage() {
  const [data, setData] = useState<FollowersPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/studio/followers")
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
      title="Followers"
      subtitle="Recent followers and audience growth."
      actions={
        data?.handle ? (
          <Link
            href={`/u/${data.handle}/followers`}
            className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Full list →
          </Link>
        ) : null
      }
    >
      {loading ? <Skeleton className="h-32 rounded-[var(--radius-2xl)]" /> : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StudioStat label="Followers" value={fmt(data.followersCount)} />
            <StudioStat label="Following" value={fmt(data.followingCount)} />
            <StudioStat
              label="New (7d)"
              value={fmt(data.newFollowers7d)}
            />
          </div>
          <StudioPanel title="Recent followers" className="mt-6">
            <ul className="space-y-3 text-sm">
              {data.followers.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3">
                  <Link
                    href={f.handle ? `/u/${f.handle}` : "#"}
                    className="truncate font-medium hover:underline"
                  >
                    @{f.handle || "user"}
                    {f.isVerified ? " ✓" : ""}
                  </Link>
                  <span className="shrink-0 text-[var(--muted)]">
                    {new Date(f.followedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
              {!data.followers.length ? (
                <li className="text-[var(--muted)]">No followers yet</li>
              ) : null}
            </ul>
          </StudioPanel>
        </>
      ) : null}
    </StudioShell>
  );
}
