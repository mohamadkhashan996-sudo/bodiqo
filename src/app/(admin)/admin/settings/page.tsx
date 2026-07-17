"use client";

import { useEffect, useState } from "react";
import {
  AdminPageHeader,
  Panel,
  adminPatch,
  useAdminJson,
} from "@/components/admin/admin-ui";

type Settings = {
  websiteName?: string;
  tagline?: string;
  logoUrl?: string;
  theme?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  email?: { from?: string; enabled?: boolean };
  pushNotifications?: { enabled?: boolean };
  security?: {
    requireEmailVerification?: boolean;
    maxLoginAttempts?: number;
    sessionDays?: number;
    lockoutMinutes?: number;
  };
  storage?: { maxUploadMb?: number; provider?: string };
  mediaLimits?: {
    imageMaxMb?: number;
    videoMaxMb?: number;
    voiceMaxMb?: number;
    documentMaxMb?: number;
  };
  registration?: {
    open?: boolean;
    inviteOnly?: boolean;
  };
  comments?: { enabled?: boolean; requireFollow?: boolean };
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--signal)]";

export default function AdminSettingsPage() {
  const { data, loading, error, reload } = useAdminJson<{
    settings: Settings;
  }>("/api/admin/settings");
  const [form, setForm] = useState<Settings>({});
  const [advanced, setAdvanced] = useState(false);
  const [raw, setRaw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.settings) {
      setForm(data.settings);
      setRaw(JSON.stringify(data.settings, null, 2));
    }
  }, [data]);

  function setNested<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function saveForm() {
    try {
      await adminPatch("/api/admin/settings", form);
      setMsg("Settings saved");
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function saveRaw() {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
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
        subtitle="Site identity, maintenance, security, registration, media limits, and delivery."
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      {msg ? <p className="mb-3 text-sm text-[var(--signal-deep)]">{msg}</p> : null}

      {!advanced ? (
        <div className="space-y-4">
          <Panel className="grid gap-4 md:grid-cols-2">
            <h2 className="md:col-span-2 font-[family-name:var(--font-syne)] text-lg font-semibold">
              Website
            </h2>
            <Field label="Name">
              <input
                className={inputClass}
                value={form.websiteName ?? ""}
                onChange={(e) => setNested("websiteName", e.target.value)}
              />
            </Field>
            <Field label="Tagline">
              <input
                className={inputClass}
                value={form.tagline ?? ""}
                onChange={(e) => setNested("tagline", e.target.value)}
              />
            </Field>
            <Field label="Logo URL">
              <input
                className={inputClass}
                value={form.logoUrl ?? ""}
                onChange={(e) => setNested("logoUrl", e.target.value)}
              />
            </Field>
            <Field label="Theme">
              <input
                className={inputClass}
                value={form.theme ?? ""}
                onChange={(e) => setNested("theme", e.target.value)}
              />
            </Field>
          </Panel>

          <Panel className="grid gap-4 md:grid-cols-2">
            <h2 className="md:col-span-2 font-[family-name:var(--font-syne)] text-lg font-semibold">
              Maintenance & registration
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.maintenanceMode)}
                onChange={(e) => setNested("maintenanceMode", e.target.checked)}
              />
              Maintenance mode
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.registration?.open !== false}
                onChange={(e) =>
                  setNested("registration", {
                    ...form.registration,
                    open: e.target.checked,
                  })
                }
              />
              Registration open
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.registration?.inviteOnly)}
                onChange={(e) =>
                  setNested("registration", {
                    ...form.registration,
                    inviteOnly: e.target.checked,
                  })
                }
              />
              Invite only
            </label>
            <p className="text-xs text-[var(--muted-strong)]">
              Bot protection uses honeypot fields and rate limits (no captcha provider wired).
            </p>
            <Field label="Maintenance message">
              <input
                className={inputClass}
                value={form.maintenanceMessage ?? ""}
                onChange={(e) => setNested("maintenanceMessage", e.target.value)}
              />
            </Field>
          </Panel>

          <Panel className="grid gap-4 md:grid-cols-2">
            <h2 className="md:col-span-2 font-[family-name:var(--font-syne)] text-lg font-semibold">
              Security
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.security?.requireEmailVerification !== false}
                onChange={(e) =>
                  setNested("security", {
                    ...form.security,
                    requireEmailVerification: e.target.checked,
                  })
                }
              />
              Require email verification
            </label>
            <Field label="Max login attempts">
              <input
                type="number"
                className={inputClass}
                value={form.security?.maxLoginAttempts ?? 8}
                onChange={(e) =>
                  setNested("security", {
                    ...form.security,
                    maxLoginAttempts: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Lockout minutes">
              <input
                type="number"
                className={inputClass}
                value={form.security?.lockoutMinutes ?? 15}
                onChange={(e) =>
                  setNested("security", {
                    ...form.security,
                    lockoutMinutes: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Session days">
              <input
                type="number"
                className={inputClass}
                value={form.security?.sessionDays ?? 30}
                onChange={(e) =>
                  setNested("security", {
                    ...form.security,
                    sessionDays: Number(e.target.value),
                  })
                }
              />
            </Field>
          </Panel>

          <Panel className="grid gap-4 md:grid-cols-2">
            <h2 className="md:col-span-2 font-[family-name:var(--font-syne)] text-lg font-semibold">
              Delivery & storage
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.email?.enabled)}
                onChange={(e) =>
                  setNested("email", { ...form.email, enabled: e.target.checked })
                }
              />
              Email enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.pushNotifications?.enabled !== false}
                onChange={(e) =>
                  setNested("pushNotifications", { enabled: e.target.checked })
                }
              />
              Push notifications
            </label>
            <Field label="Email from">
              <input
                className={inputClass}
                value={form.email?.from ?? ""}
                onChange={(e) =>
                  setNested("email", { ...form.email, from: e.target.value })
                }
              />
            </Field>
            <Field label="Max upload (MB)">
              <input
                type="number"
                className={inputClass}
                value={form.storage?.maxUploadMb ?? 50}
                onChange={(e) =>
                  setNested("storage", {
                    ...form.storage,
                    maxUploadMb: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Image max MB">
              <input
                type="number"
                className={inputClass}
                value={form.mediaLimits?.imageMaxMb ?? 10}
                onChange={(e) =>
                  setNested("mediaLimits", {
                    ...form.mediaLimits,
                    imageMaxMb: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Video max MB">
              <input
                type="number"
                className={inputClass}
                value={form.mediaLimits?.videoMaxMb ?? 200}
                onChange={(e) =>
                  setNested("mediaLimits", {
                    ...form.mediaLimits,
                    videoMaxMb: Number(e.target.value),
                  })
                }
              />
            </Field>
          </Panel>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveForm()}
              className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm text-[var(--cloud)]"
            >
              Save settings
            </button>
            <button
              type="button"
              onClick={() => setAdvanced(true)}
              className="rounded-full border-2 border-[var(--mist-strong)] px-5 py-2.5 text-sm"
            >
              Advanced JSON
            </button>
          </div>
        </div>
      ) : (
        <Panel>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={28}
            className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-4 font-mono text-xs leading-5 outline-none focus:border-[var(--signal)]"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveRaw()}
              className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm text-[var(--cloud)]"
            >
              Save JSON
            </button>
            <button
              type="button"
              onClick={() => setAdvanced(false)}
              className="rounded-full border-2 border-[var(--mist-strong)] px-5 py-2.5 text-sm"
            >
              Back to form
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}
