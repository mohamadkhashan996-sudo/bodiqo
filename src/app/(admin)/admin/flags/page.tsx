"use client";

import { useEffect, useState } from "react";

import {
  AdminPageHeader,
  adminPatch,
  Panel,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminFlagsPage() {
  const { data, loading, error, reload } = useAdminJson<{
    flags: Record<string, boolean>;
  }>("/api/admin/flags");
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.flags) setFlags(data.flags);
  }, [data]);

  async function save() {
    await adminPatch("/api/admin/flags", { flags });
    setMsg("Feature flags saved");
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Feature flags"
        subtitle="Product kill-switches stored in SystemSetting.featureFlags. Not game flags."
      />
      {msg ? <p className="mb-3 text-sm text-[var(--signal-deep)]">{msg}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <Panel>
        <ul className="space-y-3">
          {Object.entries(flags).map(([key, value]) => (
            <li
              key={key}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mist-strong)] px-4 py-3"
            >
              <span className="text-sm font-medium">{key}</span>
              <button
                type="button"
                onClick={() =>
                  setFlags((prev) => ({ ...prev, [key]: !prev[key] }))
                }
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  value
                    ? "bg-[var(--signal)] text-[var(--ink)]"
                    : "border border-[var(--mist-strong)] text-[var(--muted)]"
                }`}
              >
                {value ? "ON" : "OFF"}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-4 rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--cloud)]"
          onClick={() => void save().catch((e) => setMsg(String(e)))}
        >
          Save flags
        </button>
      </Panel>
    </div>
  );
}
