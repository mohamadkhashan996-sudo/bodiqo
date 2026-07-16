"use client";

import { useState } from "react";
import {
  AdminPageHeader,
  Panel,
  adminPost,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminRolesPage() {
  const { data, loading, error, reload } = useAdminJson<{
    system: Array<{ role: string; rank: number; permissions: string[] }>;
    custom: Array<{ id: string; name: string; description: string | null; permissions: unknown }>;
  }>("/api/admin/roles");
  const [name, setName] = useState("");

  async function createRole() {
    if (!name.trim()) return;
    await adminPost("/api/admin/roles", {
      action: "upsert",
      name: name.trim(),
      description: "Custom staff role",
      permissions: ["admin:access", "users:read", "reports:read", "content:read"],
    });
    setName("");
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Roles & permissions"
        subtitle="Super Admin, Owner, Administrator, Moderator, Support, Verified/Normal users, and custom roles."
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <div className="mb-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Custom role name"
          className="rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-2 text-sm"
        />
        <button type="button" className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs text-[var(--cloud)]" onClick={() => void createRole()}>
          Create custom role
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.system.map((r) => (
          <Panel key={r.role}>
            <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">{r.role}</h2>
            <p className="text-xs text-[var(--muted)]">Rank {r.rank}</p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              {r.permissions.join(", ") || "No admin permissions"}
            </p>
          </Panel>
        ))}
      </div>
      <h2 className="mt-8 font-[family-name:var(--font-syne)] text-xl font-semibold">Custom roles</h2>
      <div className="mt-3 space-y-3">
        {data?.custom.map((c) => (
          <Panel key={c.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-[var(--muted)]">{c.description}</p>
            </div>
            <button
              type="button"
              className="text-xs text-[var(--ember)] underline"
              onClick={() => void adminPost("/api/admin/roles", { action: "delete", id: c.id }).then(reload)}
            >
              Delete
            </button>
          </Panel>
        ))}
      </div>
    </div>
  );
}
