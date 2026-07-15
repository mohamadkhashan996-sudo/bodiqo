"use client";

import { useCallback, useEffect, useState } from "react";

type LogRow = {
  id: string;
  actorEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  summary: string | null;
  ip: string | null;
  createdAt: string;
};

export function ActivityLogViewer() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/activity?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load activity");
      return;
    }
    setLogs(data.logs || []);
    setError(null);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Activity logs
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Audit trail for admin actions — settings, backups, catalog, and orders.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, action, entity…"
          className="min-w-[240px] flex-1 rounded-full border border-white/10 bg-[#121212] px-5 py-3 text-sm outline-none focus:border-[#4a8cff]"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Search
        </button>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121212] text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="hidden px-4 py-3 md:table-cell">Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-white/5">
                <td className="px-4 py-3 text-[#f3efe6]/55">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {log.actorEmail || "system"}
                  {log.ip ? (
                    <span className="mt-0.5 block text-[10px] text-[#f3efe6]/35">
                      {log.ip}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[#4a8cff]">{log.action}</span>
                  {log.entity ? (
                    <span className="mt-0.5 block text-[10px] text-[#f3efe6]/35">
                      {log.entity}
                      {log.entityId ? ` · ${log.entityId.slice(0, 10)}` : ""}
                    </span>
                  ) : null}
                </td>
                <td className="hidden px-4 py-3 text-[#f3efe6]/70 md:table-cell">
                  {log.summary || "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-[#f3efe6]/45">
                  No activity yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
