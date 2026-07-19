"use client";

import Link from "next/link";

import {
  AdminPageHeader,
  Panel,
  StatCard,
  useAdminJson,
} from "@/components/admin/admin-ui";

type Overview = {
  totals: Record<string, number>;
  realtime?: {
    onlineNow: number;
    viewsLast5m: number;
    postsLast5m: number;
    refreshedAt: string;
  };
  activity: {
    daily: { posts: number; messages: number };
    weekly: { posts: number; messages: number };
    monthly: { posts: number; messages: number };
  };
  health: {
    server: string;
    database: string;
    storageBytes: number;
    revenueReady: boolean;
  };
  generatedAt: string;
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

const shortcuts = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/content", label: "Content review" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/flags", label: "Feature flags" },
  { href: "/admin/security", label: "Security logs" },
  { href: "/admin/settings", label: "System settings" },
];

export function AdminOverviewClient() {
  const { data, error, loading } = useAdminJson<Overview>(
    "/api/admin/overview",
  );

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Live platform pulse — users, content, health, and moderation queues."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2 text-xs tracking-[0.12em] uppercase hover:border-[var(--signal)]"
          >
            {item.label}
          </Link>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading overview…</p>
      ) : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      {data ? (
        <>
          {data.realtime ? (
            <Panel className="mb-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                    Realtime
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Cached ~30s ·{" "}
                    {new Date(data.realtime.refreshedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Online now"
                  value={data.realtime.onlineNow}
                />
                <StatCard
                  label="Views (5m)"
                  value={data.realtime.viewsLast5m}
                />
                <StatCard
                  label="Posts (5m)"
                  value={data.realtime.postsLast5m}
                />
              </div>
            </Panel>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={data.totals.users ?? 0} />
            <StatCard
              label="Active users"
              value={data.totals.activeUsers ?? 0}
              hint="Seen in 7 days"
            />
            <StatCard label="Online now" value={data.totals.onlineUsers ?? 0} />
            <StatCard label="New today" value={data.totals.newUsers ?? 0} />
            <StatCard label="Posts" value={data.totals.posts ?? 0} />
            <StatCard label="Stories" value={data.totals.stories ?? 0} />
            <StatCard label="Videos" value={data.totals.videos ?? 0} />
            <StatCard
              label="Communities"
              value={data.totals.communities ?? 0}
            />
            <StatCard label="Messages" value={data.totals.messages ?? 0} />
            <StatCard
              label="Open reports"
              value={data.totals.openReports ?? 0}
            />
            <StatCard
              label="Open tickets"
              value={data.totals.openTickets ?? 0}
            />
            <StatCard
              label="Banned users"
              value={data.totals.bannedUsers ?? 0}
            />
            <StatCard
              label="Suspended"
              value={data.totals.suspendedUsers ?? 0}
            />
            <StatCard
              label="Verification queue"
              value={data.totals.verificationPending ?? 0}
            />
            <StatCard
              label="Revenue ready"
              value={data.health.revenueReady ? "Yes" : "No"}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Daily activity
              </h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Posts {data.activity.daily.posts} · Messages{" "}
                {data.activity.daily.messages}
              </p>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Weekly activity
              </h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Posts {data.activity.weekly.posts} · Messages{" "}
                {data.activity.weekly.messages}
              </p>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Monthly activity
              </h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Posts {data.activity.monthly.posts} · Messages{" "}
                {data.activity.monthly.messages}
              </p>
            </Panel>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Panel>
              <h2 className="text-sm font-medium">Server health</h2>
              <p className="mt-2 text-[var(--signal-deep)] capitalize">
                {data.health.server}
              </p>
            </Panel>
            <Panel>
              <h2 className="text-sm font-medium">Database health</h2>
              <p className="mt-2 text-[var(--signal-deep)] capitalize">
                {data.health.database}
              </p>
            </Panel>
            <Panel>
              <h2 className="text-sm font-medium">Storage usage</h2>
              <p className="mt-2">{fmtBytes(data.health.storageBytes)}</p>
            </Panel>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </>
      ) : null}
    </div>
  );
}
