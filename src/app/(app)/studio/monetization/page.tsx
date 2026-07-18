"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  StudioPanel,
  StudioShell,
  StudioStat,
  fmt,
} from "@/components/studio/studio-shell";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Payload = {
  wallet: { coins: number; updatedAt: string | null };
  summary: {
    giftCoins30d: number;
    giftEvents30d: number;
    giftCoinsLifetime: number;
    giftEventsLifetime: number;
  };
  recentGifts: Array<{
    id: string;
    coins: number;
    giftName: string;
    createdAt: string;
    sessionTitle: string;
    sender: { handle: string | null; name: string | null };
  }>;
  recentSessions: Array<{
    id: string;
    title: string;
    status: string;
    giftCoins: number;
    peakViewers: number;
    startedAt: string;
  }>;
  note: string;
};

export default function StudioMonetizationPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/studio/monetization")
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
      title="Monetization"
      subtitle="Live gift earnings for the current Relune economy."
      actions={
        <Link
          href="/live/go"
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Go live →
        </Link>
      }
    >
      {loading ? <Skeleton className="h-32 rounded-[var(--radius-2xl)]" /> : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {data ? (
        <>
          <p className="mb-4 text-sm text-[var(--muted)]">{data.note}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StudioStat label="Wallet coins" value={fmt(data.wallet.coins)} />
            <StudioStat
              label="Gift coins (30d)"
              value={fmt(data.summary.giftCoins30d)}
            />
            <StudioStat
              label="Gifts (30d)"
              value={fmt(data.summary.giftEvents30d)}
            />
            <StudioStat
              label="Lifetime gift coins"
              value={fmt(data.summary.giftCoinsLifetime)}
            />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <StudioPanel title="Recent gifts received">
              <ul className="space-y-2 text-sm">
                {data.recentGifts.map((g) => (
                  <li key={g.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {g.giftName} from @{g.sender.handle || "user"} ·{" "}
                      {g.sessionTitle}
                    </span>
                    <span className="shrink-0">{fmt(g.coins)}</span>
                  </li>
                ))}
                {!data.recentGifts.length ? (
                  <li className="text-[var(--muted)]">No gifts yet</li>
                ) : null}
              </ul>
            </StudioPanel>
            <StudioPanel title="Recent live sessions">
              <ul className="space-y-2 text-sm">
                {data.recentSessions.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <Link href={`/live/${s.id}`} className="truncate hover:underline">
                      {s.title} · {s.status}
                    </Link>
                    <span className="shrink-0">
                      {fmt(s.giftCoins)} coins · {fmt(s.peakViewers)} peak
                    </span>
                  </li>
                ))}
                {!data.recentSessions.length ? (
                  <li className="text-[var(--muted)]">No live sessions yet</li>
                ) : null}
              </ul>
            </StudioPanel>
          </div>
        </>
      ) : null}
    </StudioShell>
  );
}
