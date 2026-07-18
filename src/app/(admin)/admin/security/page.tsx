"use client";

import {
  AdminPageHeader,
  Panel,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminSecurityPage() {
  const { data, loading, error } = useAdminJson<{
    logs: Array<{
      id: string;
      type: string;
      severity: string;
      message?: string | null;
      meta?: unknown;
      ip: string | null;
      createdAt: string;
    }>;
  }>("/api/admin/monitoring?logs=security&take=80");

  return (
    <div>
      <AdminPageHeader
        title="Security logs"
        subtitle="SecurityEvent stream — rate limits, abuse signals, and staff-relevant alerts."
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <Panel>
        <ul className="space-y-3 text-sm">
          {(data?.logs ?? []).map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-[var(--mist-strong)] px-4 py-3"
            >
              <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                {row.severity} · {row.type}
              </p>
              <p className="mt-1">
                {row.message ||
                  (typeof row.meta === "object" && row.meta
                    ? JSON.stringify(row.meta)
                    : "Security event")}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {row.ip ? `${row.ip} · ` : ""}
                {new Date(row.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
          {!loading && !(data?.logs?.length) ? (
            <li className="text-[var(--muted)]">No security events yet</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
