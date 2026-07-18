"use client";

import { useEffect, useState } from "react";

import {
  StudioPanel,
  StudioShell,
} from "@/components/studio/studio-shell";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Report = {
  id: string;
  status: string;
  category: string;
  reason: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
};

export default function StudioReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/studio/reports")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setReports(json.reports ?? []);
        setNote(json.note ?? "");
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudioShell
      title="Reports"
      subtitle="Moderation reports filed against your account or posts."
    >
      {loading ? <Skeleton className="h-32 rounded-[var(--radius-2xl)]" /> : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {!loading && !error ? (
        <>
          {note ? (
            <p className="mb-4 text-sm text-[var(--muted)]">{note}</p>
          ) : null}
          <StudioPanel title={`${reports.length} reports`}>
            <ul className="space-y-3 text-sm">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-[var(--mist-strong)] p-3"
                >
                  <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                    {r.status} · {r.category} · {r.targetType}
                  </p>
                  <p className="mt-1">{r.reason}</p>
                  {r.resolution ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Resolution: {r.resolution}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
              {!reports.length ? (
                <li className="text-[var(--muted)]">No reports on your content</li>
              ) : null}
            </ul>
          </StudioPanel>
        </>
      ) : null}
    </StudioShell>
  );
}
