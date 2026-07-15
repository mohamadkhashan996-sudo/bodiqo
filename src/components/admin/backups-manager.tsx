"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type BackupRow = {
  id: string;
  filename: string;
  sizeBytes: number;
  sizeLabel: string;
  trigger: string;
  status: string;
  note: string | null;
  createdAt: string;
};

type BackupSettings = {
  autoEnabled: boolean;
  intervalHours: number;
  retainCount: number;
  lastAutoAt: string;
};

export function BackupsManager() {
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/backups");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load backups");
      return;
    }
    setBackups(data.backups || []);
    setSettings(data.settings);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBackup() {
    setBusy(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admin/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Backup failed");
      return;
    }
    setNote("");
    setMessage(`Backup created: ${data.backup.filename}`);
    await load();
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    const res = await fetch("/api/admin/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settings", ...settings }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Failed to save settings");
      return;
    }
    setSettings(data.settings);
    setMessage("Automatic backup settings saved");
  }

  async function restore(id: string) {
    const ok = window.confirm(
      "This will REPLACE the current database with the selected backup. Continue?",
    );
    if (!ok) return;
    const typed = window.prompt('Type RESTORE to confirm full restore:');
    if (typed !== "RESTORE") {
      setError("Restore cancelled");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/backups/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", confirm: "RESTORE" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Restore failed");
      return;
    }
    setMessage("Database restored. Reloading…");
    window.setTimeout(() => window.location.reload(), 800);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this backup file?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/backups/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Delete failed");
      return;
    }
    setMessage("Backup deleted");
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Backups
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Create, download, restore, and schedule automatic full database
          backups. Super Admin only.
        </p>
      </div>

      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <section className="rounded-2xl border border-white/10 bg-[#121212] p-6">
        <h2 className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
          Create backup
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void createBackup()}
            className="rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase disabled:opacity-50"
          >
            {busy ? "Working…" : "Backup now"}
          </button>
        </div>
        <label className="mt-5 block text-sm text-[#f3efe6]/60">
          Upload backup JSON to restore later
          <input
            type="file"
            accept="application/json,.json"
            className="mt-2 block w-full text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError(null);
              const form = new FormData();
              form.append("file", file);
              const res = await fetch("/api/admin/backups", {
                method: "POST",
                body: form,
              });
              const data = await res.json();
              setBusy(false);
              if (!res.ok) {
                setError(data.error || "Upload failed");
                return;
              }
              setMessage(`Uploaded ${data.backup.filename}`);
              await load();
            }}
          />
        </label>
      </section>

      {settings ? (
        <form
          onSubmit={saveSettings}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
        >
          <h2 className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
            Automatic backups
          </h2>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.autoEnabled}
              onChange={(e) =>
                setSettings({ ...settings, autoEnabled: e.target.checked })
              }
            />
            Enable automatic backups
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
                Interval (hours)
              </span>
              <input
                type="number"
                min={1}
                max={168}
                value={settings.intervalHours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    intervalHours: Number(e.target.value),
                  })
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
                Keep last N backups
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.retainCount}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    retainCount: Number(e.target.value),
                  })
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
              />
            </label>
          </div>
          <p className="text-xs text-[#f3efe6]/40">
            Last auto run:{" "}
            {settings.lastAutoAt
              ? new Date(settings.lastAutoAt).toLocaleString()
              : "Never"}
            . Also call{" "}
            <code className="text-[#4a8cff]">/api/cron/backup</code> with{" "}
            <code className="text-[#4a8cff]">CRON_SECRET</code> from an external
            scheduler.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.16em] uppercase"
          >
            Save schedule
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121212] text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
            <tr>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Trigger</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  <p className="text-[#f3efe6]">{b.filename}</p>
                  {b.note ? (
                    <p className="text-xs text-[#f3efe6]/40">{b.note}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[#f3efe6]/60">{b.trigger}</td>
                <td className="px-4 py-3">{b.sizeLabel}</td>
                <td className="px-4 py-3 text-[#f3efe6]/55">
                  {new Date(b.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <a
                      href={`/api/admin/backups/${b.id}?download=1`}
                      className="text-xs text-[#4a8cff]"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void restore(b.id)}
                      className="text-xs text-amber-300"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(b.id)}
                      className="text-xs text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {backups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[#f3efe6]/45">
                  No backups yet. Create one above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
