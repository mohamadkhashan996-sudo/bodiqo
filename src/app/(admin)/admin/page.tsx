"use client";

import { AdminPageHeader, Panel, StatCard, useAdminJson } from "@/components/admin/admin-ui";

type Overview = {
  totals: Record<string, number>;
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

export default function AdminOverviewPage() {
  const { data, error, loading } = useAdminJson<Overview>("/api/admin/overview");

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Live platform pulse — users, content, health, and revenue readiness."
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading overview…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={data.totals.users} />
            <StatCard label="Active users" value={data.totals.activeUsers} hint="Seen in 7 days" />
            <StatCard label="Online now" value={data.totals.onlineUsers} />
            <StatCard label="New today" value={data.totals.newUsers} />
            <StatCard label="Posts" value={data.totals.posts} />
            <StatCard label="Stories" value={data.totals.stories} />
            <StatCard label="Videos" value={data.totals.videos} />
            <StatCard label="Communities" value={data.totals.communities} />
            <StatCard label="Messages" value={data.totals.messages} />
            <StatCard label="Open reports" value={data.totals.openReports} />
            <StatCard
              label="Verification queue"
              value={data.totals.verificationPending}
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
              <p className="mt-2 capitalize text-[var(--signal-deep)]">
                {data.health.server}
              </p>
            </Panel>
            <Panel>
              <h2 className="text-sm font-medium">Database health</h2>
              <p className="mt-2 capitalize text-[var(--signal-deep)]">
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
