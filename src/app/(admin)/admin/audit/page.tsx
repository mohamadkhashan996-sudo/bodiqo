"use client";

import {
  AdminPageHeader,
  Panel,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminAuditPage() {
  const { data, loading, error } = useAdminJson<{
    logs: Array<{
      id: string;
      action: string;
      target: string | null;
      actorId: string | null;
      createdAt: string;
      meta?: unknown;
    }>;
  }>("/api/admin/audit?take=80");

  return (
    <div>
      <AdminPageHeader
        title="Audit log"
        subtitle="Staff actions across users, content, reports, and settings."
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <Panel className="space-y-2">
        {data?.logs.map((log) => (
          <div
            key={log.id}
            className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[var(--mist-strong)] py-3 text-sm last:border-0"
          >
            <div>
              <p className="font-medium">{log.action}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                actor {log.actorId || "system"}
                {log.target ? ` · target ${log.target}` : ""}
              </p>
            </div>
            <time className="text-xs text-[var(--muted)]">
              {new Date(log.createdAt).toLocaleString()}
            </time>
          </div>
        ))}
        {!data?.logs.length && !loading ? (
          <p className="text-sm text-[var(--muted)]">No audit events yet.</p>
        ) : null}
      </Panel>
    </div>
  );
}
