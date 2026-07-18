"use client";

import { useEffect, useState } from "react";

import {
  AdminPageHeader,
  adminPatch,
  Panel,
  StatCard,
  useAdminJson,
} from "@/components/admin/admin-ui";
import {
  type AuthProviderFlags,
  OAUTH_PROVIDER_ORDER,
  type OAuthProviderId,
  PROVIDER_SHORT,
} from "@/modules/auth/providers";

type AuthConfig = {
  flags: AuthProviderFlags;
  env: Record<OAuthProviderId, boolean>;
};

type AuthStats = {
  totals: {
    users: number;
    verifiedUsers: number;
    withPassword: number;
    logins30d: number;
    failed30d: number;
  };
  oauthAccounts: Array<{ provider: string; count: number }>;
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
  const config = useAdminJson<AuthConfig>("/api/admin/auth");
  const stats = useAdminJson<AuthStats>("/api/admin/auth?stats=1");
  const [flags, setFlags] = useState<AuthProviderFlags | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (config.data?.flags) setFlags(config.data.flags);
  }, [config.data]);

  async function toggle(key: keyof AuthProviderFlags) {
    if (!flags) return;
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next);
    try {
      await adminPatch("/api/admin/auth", { [key]: next[key] });
      setMsg(`${PROVIDER_SHORT[key]} ${next[key] ? "enabled" : "disabled"}`);
      await config.reload();
    } catch (e) {
      setFlags(flags);
      setMsg(e instanceof Error ? e.message : "Update failed");
    }
  }

  const providerKeys = [...OAUTH_PROVIDER_ORDER, "credentials" as const];

  return (
    <div>
      <AdminPageHeader
        title="Authentication"
        subtitle="Enable login providers, review auth health, and inspect login history."
      />
      {msg ? (
        <p className="mb-4 text-sm text-[var(--signal-deep)]">{msg}</p>
      ) : null}

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
            Login providers
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Toggle availability. Providers without env credentials stay
            inactive.
          </p>
          <ul className="mt-5 space-y-3">
            {providerKeys.map((key) => {
              const envOk =
                key === "credentials" ? true : Boolean(config.data?.env?.[key]);
              const enabled = flags?.[key] ?? true;
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--mist-strong)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{PROVIDER_SHORT[key]}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {envOk
                        ? "Credentials configured"
                        : "Missing env credentials"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggle(key)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase ${
                      enabled
                        ? "bg-[var(--signal)] text-[var(--ink)]"
                        : "bg-[var(--mist)] text-[var(--muted)]"
                    }`}
                  >
                    {enabled ? "On" : "Off"}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-semibold">
            Logins by provider · 30d
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
          <h3 className="mt-6 text-sm font-semibold">
            Connected OAuth accounts
          </h3>
          <ul className="mt-2 space-y-2">
            {(stats.data?.oauthAccounts ?? []).map((row) => (
              <li key={row.provider} className="flex justify-between text-sm">
                <span>{row.provider}</span>
                <span className="text-[var(--muted)] tabular-nums">
                  {row.count}
                </span>
              </li>
            ))}
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
