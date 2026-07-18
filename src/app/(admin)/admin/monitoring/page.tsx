"use client";

import {
  AdminPageHeader,
  Panel,
  StatCard,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminMonitoringPage() {
  const { data, loading, error } = useAdminJson<{
    errorsLast24h: number;
    auditEventsLast24h: number;
    database: {
      users: number;
      posts: number;
      messages: number;
      storageBytes: number;
    };
    server: { uptimeSec: number; memoryMb: number; node: string };
    securityLogs: Array<{
      id: string;
      type: string;
      severity: string;
      createdAt: string;
    }>;
  }>("/api/admin/monitoring");

  return (
    <div>
      <AdminPageHeader
        title="Monitoring"
        subtitle="Errors, performance, database, API activity, server, storage, and security logs."
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Errors (24h)" value={data.errorsLast24h} />
            <StatCard
              label="Audit events (24h)"
              value={data.auditEventsLast24h}
            />
            <StatCard label="Memory (MB)" value={data.server.memoryMb} />
            <StatCard label="Uptime (sec)" value={data.server.uptimeSec} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Database
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                <li>Users {data.database.users}</li>
                <li>Posts {data.database.posts}</li>
                <li>Messages {data.database.messages}</li>
                <li>Storage {data.database.storageBytes} bytes</li>
              </ul>
              <p className="mt-3 text-xs">Node {data.server.node}</p>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Security logs
              </h2>
              <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-xs text-[var(--muted)]">
                {data.securityLogs.map((l) => (
                  <li key={l.id}>
                    [{l.severity}] {l.type} ·{" "}
                    {new Date(l.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
