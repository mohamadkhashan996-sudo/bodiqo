"use client";

import {
  AdminPageHeader,
  Panel,
  StatCard,
  adminPost,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminMediaPage() {
  const { data, loading, error, reload } = useAdminJson<{
    assets: Array<{
      id: string;
      kind: string;
      originalUrl: string;
      sizeBytes: number;
      status: string;
      owner: { handle: string | null } | null;
    }>;
    stats: {
      totalBytes: number;
      totalFiles: number;
      byKind: Array<{ kind: string; files: number; bytes: number }>;
    };
  }>("/api/admin/media");

  async function registerSample() {
    await adminPost("/api/admin/media", {
      action: "register",
      kind: "IMAGE",
      originalUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800",
      mimeType: "image/jpeg",
      sizeBytes: 120000,
      width: 800,
      height: 600,
    });
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Media system"
        subtitle="Images, videos, voice, documents — compression hooks, thumbnails, storage monitoring."
      />
      <button type="button" className="mb-4 rounded-full border px-4 py-2 text-xs" onClick={() => void registerSample()}>
        Register sample image asset
      </button>
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Files" value={data.stats.totalFiles} />
            <StatCard label="Storage bytes" value={data.stats.totalBytes} />
            <StatCard label="Kinds tracked" value={data.stats.byKind.length} />
          </div>
          <Panel className="mt-6 space-y-3">
            {data.assets.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{a.kind} · {a.status}</p>
                  <p className="text-xs text-[var(--muted)] truncate max-w-md">{a.originalUrl}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-[var(--ember)] underline"
                  onClick={() => void adminPost("/api/admin/media", { action: "delete", id: a.id }).then(reload)}
                >
                  Delete
                </button>
              </div>
            ))}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
