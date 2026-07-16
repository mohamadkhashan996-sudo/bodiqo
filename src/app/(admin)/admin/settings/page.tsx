"use client";

import { useEffect, useState } from "react";
import {
  AdminPageHeader,
  Panel,
  adminPatch,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminSettingsPage() {
  const { data, loading, error, reload } = useAdminJson<{
    settings: Record<string, unknown>;
  }>("/api/admin/settings");
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.settings) setDraft(JSON.stringify(data.settings, null, 2));
  }, [data]);

  async function save() {
    try {
      const parsed = JSON.parse(draft) as Record<string, unknown>;
      await adminPatch("/api/admin/settings", parsed);
      setMsg("Settings saved");
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="System settings"
        subtitle="Website name, logo, theme, languages, email, push, maintenance, security, storage, media and registration."
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      {msg ? <p className="mb-3 text-sm text-[var(--signal-deep)]">{msg}</p> : null}
      <Panel>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={28}
          className="w-full rounded-2xl border border-[var(--mist)] bg-white/70 p-4 font-mono text-xs leading-5 outline-none focus:border-[var(--signal)]"
        />
        <button
          type="button"
          onClick={() => void save()}
          className="mt-4 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm text-[var(--cloud)]"
        >
          Save settings
        </button>
      </Panel>
    </div>
  );
}
