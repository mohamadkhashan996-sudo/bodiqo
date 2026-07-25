"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  fmt,
  StudioPanel,
  StudioShell,
} from "@/components/studio/studio-shell";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Payload = {
  paidSubscriptions: { available: boolean; note: string };
  giftSupporters: Array<{
    userId: string;
    handle: string;
    name: string;
    isVerified: boolean;
    gifts: number;
    coins: number;
  }>;
};

export default function StudioSubscribersPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/studio/subscribers")
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
      title="Supporters"
      subtitle="Gift supporters stand in for paid subscribers until CreatorPlan launches."
    >
      {loading ? <Skeleton className="h-32 rounded-[var(--radius-2xl)]" /> : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {data ? (
        <>
          <StudioPanel title="Paid subscribers">
            <p className="text-sm text-[var(--muted)]">
              {data.paidSubscriptions.note}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Status: not available in first public release
            </p>
          </StudioPanel>
          <StudioPanel title="Gift supporters (90d)" className="mt-6">
            <ul className="space-y-3 text-sm">
              {data.giftSupporters.map((s) => (
                <li
                  key={s.userId}
                  className="flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/u/${s.handle}`}
                    className="truncate font-medium hover:underline"
                  >
                    @{s.handle}
                    {s.isVerified ? " ✓" : ""}
                  </Link>
                  <span className="shrink-0 text-[var(--muted)]">
                    {fmt(s.coins)} coins · {s.gifts} gifts
                  </span>
                </li>
              ))}
              {!data.giftSupporters.length ? (
                <li className="text-[var(--muted)]">
                  No gift supporters yet — go live to receive gifts.
                </li>
              ) : null}
            </ul>
          </StudioPanel>
        </>
      ) : null}
    </StudioShell>
  );
}
