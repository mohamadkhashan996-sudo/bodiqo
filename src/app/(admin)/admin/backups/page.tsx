"use client";

import {
  AdminPageHeader,
  adminPost,
  Panel,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminBackupsPage() {
  const { data, loading, error, reload } = useAdminJson<{
    backups: Array<{
      id: string;
      type: string;
      scope: string;
      status: string;
      sizeBytes: number;
      startedAt: string;
      finishedAt: string | null;
      note: string | null;
    }>;
  }>("/api/admin/backups");

  async function create(scope: string, type = "MANUAL") {
    await adminPost("/api/admin/backups", { action: "create", scope, type });
    await reload();
  }

  async function restore(backupId: string) {
    if (!window.confirm("Restore settings from this backup?")) return;
    await adminPost("/api/admin/backups", { action: "restore", backupId });
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Backups"
        subtitle="Daily, weekly, and manual database/media backups with download and restore."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs text-[var(--cloud)]"
          onClick={() => void create("DATABASE")}
        >
          Manual DB backup
        </button>
        <button
          type="button"
          className="rounded-full border px-4 py-2 text-xs"
          onClick={() => void create("MEDIA")}
        >
          Media backup
        </button>
        <button
          type="button"
          className="rounded-full border px-4 py-2 text-xs"
          onClick={() => void create("FULL")}
        >
          Full backup
        </button>
      </div>
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <div className="space-y-3">
        {data?.backups.map((b) => (
          <Panel
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-medium">
                {b.type} · {b.scope} · {b.status}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {new Date(b.startedAt).toLocaleString()} · {b.sizeBytes} bytes
                {b.note ? ` · ${b.note}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {b.status === "COMPLETED" ? (
                <>
                  <a
                    className="rounded-full border px-3 py-1.5 text-xs"
                    href={`/api/admin/backups?download=${b.id}`}
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    className="rounded-full border px-3 py-1.5 text-xs"
                    onClick={() => void restore(b.id)}
                  >
                    Restore
                  </button>
                </>
              ) : null}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
