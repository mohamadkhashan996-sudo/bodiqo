"use client";

import {
  AdminPageHeader,
  Panel,
  StatCard,
  useAdminJson,
} from "@/components/admin/admin-ui";

type AuthStats = {
  totals: {
    users: number;
    verifiedUsers: number;
    withPassword: number;
    logins30d: number;
    failed30d: number;
  };
  loginsByProvider: Array<{ provider: string; count: number }>;
  recentLogins: Array<{
    id: string;
    provider: string | null;
    createdAt: string;
    ip: string | null;
    user: { email: string; handle: string | null };
  }>;
  failedLogins: Array<{
    id: string;
    provider: string | null;
    createdAt: string;
    ip: string | null;
    user: { email: string; handle: string | null } | null;
  }>;
};

export default function AdminAuthPage() {
  const stats = useAdminJson<AuthStats>("/api/admin/auth");

  return (
    <div>
      <AdminPageHeader
        title="Authentication"
        subtitle="Review email and phone authentication health and inspect login history."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Users" value={stats.data?.totals.users ?? "—"} />
        <StatCard
          label="Verified"
          value={stats.data?.totals.verifiedUsers ?? "—"}
        />
        <StatCard
          label="With password"
          value={stats.data?.totals.withPassword ?? "—"}
        />
        <StatCard
          label="Logins · 30d"
          value={stats.data?.totals.logins30d ?? "—"}
        />
        <StatCard
          label="Failed · 30d"
          value={stats.data?.totals.failed30d ?? "—"}
          hint="Investigate spikes"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-semibold">
            Authentication methods
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Relune accepts email and password or verified phone numbers.
          </p>
          <ul className="mt-5 space-y-3">
            {["Email", "Phone"].map((method) => (
              <li
                key={method}
                className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--mist-strong)] px-4 py-3"
              >
                <p className="text-sm font-medium">{method}</p>
                <span className="rounded-full bg-[var(--signal)] px-4 py-1.5 text-xs font-semibold tracking-wider text-[var(--ink)] uppercase">
                  Active
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-semibold">
            Logins by method · 30d
          </h2>
          <ul className="mt-4 space-y-2">
            {(stats.data?.loginsByProvider ?? []).length === 0 ? (
              <li className="text-sm text-[var(--muted)]">
                No recent logins yet.
              </li>
            ) : (
              stats.data?.loginsByProvider.map((row) => (
                <li key={row.provider} className="flex justify-between text-sm">
                  <span>{row.provider}</span>
                  <span className="text-[var(--muted)] tabular-nums">
                    {row.count}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-semibold">
            Recent successful logins
          </h2>
          <ul className="mt-4 max-h-80 space-y-3 overflow-auto">
            {(stats.data?.recentLogins ?? []).map((row) => (
              <li
                key={row.id}
                className="border-b-2 border-[var(--mist-strong)] pb-2 text-sm"
              >
                <p className="font-medium">
                  {row.user.handle ? `@${row.user.handle}` : row.user.email}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {row.provider ?? "credentials"} ·{" "}
                  {new Date(row.createdAt).toLocaleString()}
                  {row.ip ? ` · ${row.ip}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-semibold">
            Failed login attempts
          </h2>
          <ul className="mt-4 max-h-80 space-y-3 overflow-auto">
            {(stats.data?.failedLogins ?? []).map((row) => (
              <li
                key={row.id}
                className="border-b-2 border-[var(--mist-strong)] pb-2 text-sm"
              >
                <p className="font-medium">
                  {row.user?.handle
                    ? `@${row.user.handle}`
                    : (row.user?.email ?? "Unknown account")}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {row.provider ?? "credentials"} ·{" "}
                  {new Date(row.createdAt).toLocaleString()}
                  {row.ip ? ` · ${row.ip}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
