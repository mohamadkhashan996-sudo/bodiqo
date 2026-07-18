"use client";

import { useEffect, useState } from "react";

import {
  StudioPanel,
  StudioShell,
} from "@/components/studio/studio-shell";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Payload = {
  policy: { title: string; body: string };
  claimsAgainstYou: Array<{
    id: string;
    status: string;
    reason: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  howToReport: { path: string; category: string };
};

export default function StudioCopyrightPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/studio/copyright")
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
      title="Copyright"
      subtitle="Know your rights and track copyright reports involving your content."
    >
      {loading ? <Skeleton className="h-32 rounded-[var(--radius-2xl)]" /> : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {data ? (
        <>
          <StudioPanel title={data.policy.title}>
            <p className="text-sm leading-6 text-[var(--muted)]">
              {data.policy.body}
            </p>
            <p className="mt-3 text-sm">
              Report infringement: {data.howToReport.path} (category{" "}
              {data.howToReport.category}).
            </p>
          </StudioPanel>
          <StudioPanel title="Claims against your content" className="mt-6">
            <ul className="space-y-3 text-sm">
              {data.claimsAgainstYou.map((c) => (
                <li
                  key={c.id}
                  className="rounded-2xl border border-[var(--mist-strong)] p-3"
                >
                  <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                    {c.status} · {c.targetType}
                  </p>
                  <p className="mt-1">{c.reason}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
              {!data.claimsAgainstYou.length ? (
                <li className="text-[var(--muted)]">
                  No copyright claims against your content.
                </li>
              ) : null}
            </ul>
          </StudioPanel>
        </>
      ) : null}
    </StudioShell>
  );
}
