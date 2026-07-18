"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  AdminPageHeader,
  adminPatch,
  Panel,
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

function targetHref(type: string, id: string) {
  switch (type) {
    case "POST":
      return `/post/${id}`;
    case "USER":
      return `/admin/users?focus=${id}`;
    case "STORY":
      return `/admin/content?kind=stories`;
    case "COMMENT":
      return `/admin/content?kind=comments`;
    case "COMMUNITY":
      return `/admin/content?kind=communities`;
    case "MESSAGE":
      return `/admin/content?kind=messages&q=${id}`;
    default:
      return null;
  }
}

function ReportsPageInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") ?? "OPEN");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [msg, setMsg] = useState<string | null>(null);
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

  async function act(
    reportId: string,
    action:
      | "delete_post"
      | "delete_comment"
      | "delete_message"
      | "ban_user"
      | "none",
  ) {
    try {
      await adminPatch("/api/admin/reports", { reportId, action });
      setMsg(`Report resolved (${action})`);
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Action failed");
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Reports"
        subtitle="Queue of reported users, posts, videos, stories, and comments."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="IN_REVIEW">In review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ESCALATED">Escalated</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {msg ? (
        <p className="mb-3 text-sm text-[var(--signal-deep)]">{msg}</p>
      ) : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <div className="space-y-3">
        {data?.reports.map((r) => {
          const href = targetHref(r.targetType, r.targetId);
          return (
            <Panel key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                    {r.targetType} · {r.category} · {r.status}
                  </p>
                  <p className="mt-2 font-medium">{r.reason}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    by @{r.reporter.handle || "user"} ·{" "}
                    {href ? (
                      <Link
                        href={href}
                        className="text-[var(--signal-deep)] underline"
                      >
                        Open target
                      </Link>
                    ) : (
                      <span>target {r.targetId}</span>
                    )}
                  </p>
                  {r.details ? (
                    <p className="mt-2 text-sm">{r.details}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border px-3 py-1.5 text-xs"
                    onClick={() => void setReportStatus(r.id, "IN_REVIEW")}
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    className="rounded-full border px-3 py-1.5 text-xs"
                    onClick={() => void setReportStatus(r.id, "RESOLVED")}
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="rounded-full border px-3 py-1.5 text-xs"
                    onClick={() => void setReportStatus(r.id, "DISMISSED")}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="rounded-full border px-3 py-1.5 text-xs"
                    onClick={() => void setReportStatus(r.id, "ESCALATED")}
                  >
                    Escalate
                  </button>
                  {r.targetType === "POST" ? (
                    <button
                      type="button"
                      className="rounded-full border border-[var(--ember)]/40 px-3 py-1.5 text-xs text-[var(--ember)]"
                      onClick={() => void act(r.id, "delete_post")}
                    >
                      Delete post
                    </button>
                  ) : null}
                  {r.targetType === "COMMENT" ? (
                    <button
                      type="button"
                      className="rounded-full border border-[var(--ember)]/40 px-3 py-1.5 text-xs text-[var(--ember)]"
                      onClick={() => void act(r.id, "delete_comment")}
                    >
                      Delete comment
                    </button>
                  ) : null}
                  {r.targetType === "MESSAGE" ? (
                    <button
                      type="button"
                      className="rounded-full border border-[var(--ember)]/40 px-3 py-1.5 text-xs text-[var(--ember)]"
                      onClick={() => void act(r.id, "delete_message")}
                    >
                      Delete message
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full border border-[var(--ember)]/40 px-3 py-1.5 text-xs text-[var(--ember)]"
                    onClick={() => void act(r.id, "ban_user")}
                  >
                    Ban user
                  </button>
                </div>
              </div>
            </Panel>
          );
        })}
        {!loading && !data?.reports.length ? (
          <p className="text-sm text-[var(--muted)]">
            No reports in this filter.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}
    >
      <ReportsPageInner />
    </Suspense>
  );
}
