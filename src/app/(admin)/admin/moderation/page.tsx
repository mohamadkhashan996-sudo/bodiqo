"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AdminPageHeader,
  Panel,
  StatCard,
  adminPatch,
  useAdminJson,
} from "@/components/admin/admin-ui";

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  category: string;
  status: string;
  details: string | null;
  createdAt: string;
  reporter: { handle: string | null; displayName: string | null };
};

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
    default:
      return null;
  }
}

export default function AdminModerationPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const summary = useAdminJson<{
    counts: {
      open: number;
      inReview: number;
      escalated: number;
      bannedUsers: number;
      suspendedUsers: number;
      deletedPosts: number;
      queue: number;
    };
    recentReports: Report[];
  }>("/api/admin/moderation");

  async function setStatus(reportId: string, status: string) {
    try {
      await adminPatch("/api/admin/reports", {
        reportId,
        status,
        resolution:
          status === "RESOLVED" || status === "DISMISSED"
            ? "Handled from moderation queue"
            : undefined,
      });
      setMsg(`Report marked ${status}`);
      await summary.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function act(
    reportId: string,
    action: "delete_post" | "delete_comment" | "ban_user" | "none",
  ) {
    try {
      await adminPatch("/api/admin/reports", { reportId, action });
      setMsg(`Resolved with ${action}`);
      await summary.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Action failed");
    }
  }

  const counts = summary.data?.counts;

  return (
    <div>
      <AdminPageHeader
        title="Moderation"
        subtitle="Live enforcement queue — triage reports, remove content, and ban accounts."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Queue total" value={counts?.queue ?? "—"} />
        <StatCard label="Open" value={counts?.open ?? "—"} />
        <StatCard label="In review" value={counts?.inReview ?? "—"} />
        <StatCard label="Escalated" value={counts?.escalated ?? "—"} />
        <StatCard label="Banned users" value={counts?.bannedUsers ?? "—"} />
        <StatCard label="Suspended" value={counts?.suspendedUsers ?? "—"} />
        <StatCard label="Deleted posts" value={counts?.deletedPosts ?? "—"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel>
          <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
            Quick links
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link
                href="/admin/reports?status=OPEN"
                className="text-[var(--signal-deep)] underline"
              >
                Full reports queue
              </Link>
            </li>
            <li>
              <Link
                href="/admin/content"
                className="text-[var(--signal-deep)] underline"
              >
                Content review
              </Link>
            </li>
            <li>
              <Link
                href="/admin/banned"
                className="text-[var(--signal-deep)] underline"
              >
                Banned users
              </Link>
            </li>
            <li>
              <Link
                href="/admin/users?status=SUSPENDED"
                className="text-[var(--signal-deep)] underline"
              >
                Suspended accounts
              </Link>
            </li>
            <li>
              <Link
                href="/admin/verification"
                className="text-[var(--signal-deep)] underline"
              >
                Verification requests
              </Link>
            </li>
          </ul>
        </Panel>

        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
              Active queue
            </h2>
            <Link href="/admin/reports" className="text-xs underline">
              View all reports
            </Link>
          </div>
          {msg ? (
            <p className="mt-2 text-sm text-[var(--signal-deep)]">{msg}</p>
          ) : null}
          {summary.loading ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>
          ) : null}
          {summary.error ? (
            <p className="mt-3 text-sm text-[var(--ember)]">{summary.error}</p>
          ) : null}
          <ul className="mt-4 space-y-3">
            {summary.data?.recentReports.map((r) => {
              const href = targetHref(r.targetType, r.targetId);
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                        {r.status} · {r.targetType} · {r.category}
                      </p>
                      <p className="mt-1 font-medium">{r.reason}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        @{r.reporter.handle || "user"} ·{" "}
                        {new Date(r.createdAt).toLocaleString()}
                        {href ? (
                          <>
                            {" · "}
                            <Link
                              href={href}
                              className="text-[var(--signal-deep)] underline"
                            >
                              Open target
                            </Link>
                          </>
                        ) : null}
                      </p>
                      {r.details ? (
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          {r.details}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border px-3 py-1.5 text-xs"
                        onClick={() => void setStatus(r.id, "IN_REVIEW")}
                      >
                        Review
                      </button>
                      <button
                        type="button"
                        className="rounded-full border px-3 py-1.5 text-xs"
                        onClick={() => void setStatus(r.id, "DISMISSED")}
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        className="rounded-full border px-3 py-1.5 text-xs"
                        onClick={() => void setStatus(r.id, "ESCALATED")}
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
                      <button
                        type="button"
                        className="rounded-full border border-[var(--ember)]/40 px-3 py-1.5 text-xs text-[var(--ember)]"
                        onClick={() => void act(r.id, "ban_user")}
                      >
                        Ban user
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
            {!summary.data?.recentReports.length && !summary.loading ? (
              <p className="text-sm text-[var(--muted)]">
                Moderation queue is clear.
              </p>
            ) : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
