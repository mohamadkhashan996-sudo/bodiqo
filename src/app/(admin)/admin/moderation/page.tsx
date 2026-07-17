"use client";

import Link from "next/link";
import {
  AdminPageHeader,
  Panel,
  StatCard,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminModerationPage() {
  const reports = useAdminJson<{
    reports: Array<{
      id: string;
      targetType: string;
      reason: string;
      category: string;
      createdAt: string;
      reporter: { handle: string | null };
    }>;
  }>("/api/admin/reports?status=OPEN&take=12");
  const overview = useAdminJson<{
    totals: Record<string, number>;
  }>("/api/admin/overview");

  return (
    <div>
      <AdminPageHeader
        title="Moderation"
        subtitle="Open reports, content tools, and user enforcement in one place."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open reports"
          value={overview.data?.totals.openReports ?? "—"}
        />
        <StatCard
          label="Verification queue"
          value={overview.data?.totals.verificationPending ?? "—"}
        />
        <StatCard label="Posts" value={overview.data?.totals.posts ?? "—"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel>
          <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
            Queues
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/admin/reports?status=OPEN" className="text-[var(--signal-deep)] underline">
                Open reports
              </Link>
            </li>
            <li>
              <Link href="/admin/content" className="text-[var(--signal-deep)] underline">
                Posts & content
              </Link>
            </li>
            <li>
              <Link href="/admin/users?status=BANNED" className="text-[var(--signal-deep)] underline">
                Banned users
              </Link>
            </li>
            <li>
              <Link href="/admin/verification" className="text-[var(--signal-deep)] underline">
                Verification requests
              </Link>
            </li>
          </ul>
        </Panel>
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
              Latest open reports
            </h2>
            <Link href="/admin/reports" className="text-xs underline">
              View all
            </Link>
          </div>
          {reports.loading ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>
          ) : null}
          <ul className="mt-4 space-y-3">
            {reports.data?.reports.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-3 text-sm"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  {r.targetType} · {r.category}
                </p>
                <p className="mt-1 font-medium">{r.reason}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  @{r.reporter.handle || "user"} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
            {!reports.data?.reports.length && !reports.loading ? (
              <p className="text-sm text-[var(--muted)]">No open reports.</p>
            ) : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
