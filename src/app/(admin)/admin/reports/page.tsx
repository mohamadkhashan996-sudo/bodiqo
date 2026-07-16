"use client";

import { useState } from "react";
import {
  AdminPageHeader,
  Panel,
  adminPatch,
  useAdminJson,
} from "@/components/admin/admin-ui";

const categories = [
  "SPAM",
  "FAKE_ACCOUNT",
  "SCAM",
  "HARASSMENT",
  "COPYRIGHT",
  "NUDITY",
  "VIOLENCE",
  "OTHER",
];

export default function AdminReportsPage() {
  const [status, setStatus] = useState("OPEN");
  const [category, setCategory] = useState("");
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (category) qs.set("category", category);
  const { data, loading, error, reload } = useAdminJson<{
    reports: Array<{
      id: string;
      targetType: string;
      targetId: string;
      reason: string;
      category: string;
      status: string;
      details: string | null;
      createdAt: string;
      reporter: { handle: string | null; displayName: string | null };
    }>;
  }>(`/api/admin/reports?${qs.toString()}`);

  async function setReportStatus(reportId: string, next: string) {
    await adminPatch("/api/admin/reports", {
      reportId,
      status: next,
      resolution: next === "RESOLVED" ? "Handled by moderator" : undefined,
    });
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Moderation center"
        subtitle="Reported users, posts, videos, stories, comments — spam, scam, harassment, copyright."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-[var(--mist)] bg-white/70 px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="IN_REVIEW">In review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ESCALATED">Escalated</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-2xl border border-[var(--mist)] bg-white/70 px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <div className="space-y-3">
        {data?.reports.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  {r.targetType} · {r.category} · {r.status}
                </p>
                <p className="mt-2 font-medium">{r.reason}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  by @{r.reporter.handle || "user"} · target {r.targetId}
                </p>
                {r.details ? <p className="mt-2 text-sm">{r.details}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-full border px-3 py-1.5 text-xs" onClick={() => void setReportStatus(r.id, "IN_REVIEW")}>Review</button>
                <button type="button" className="rounded-full border px-3 py-1.5 text-xs" onClick={() => void setReportStatus(r.id, "RESOLVED")}>Resolve</button>
                <button type="button" className="rounded-full border px-3 py-1.5 text-xs" onClick={() => void setReportStatus(r.id, "DISMISSED")}>Dismiss</button>
                <button type="button" className="rounded-full border px-3 py-1.5 text-xs" onClick={() => void setReportStatus(r.id, "ESCALATED")}>Escalate</button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
