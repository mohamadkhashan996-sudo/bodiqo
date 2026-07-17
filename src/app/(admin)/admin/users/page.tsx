"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AdminPageHeader,
  Panel,
  adminPost,
  useAdminJson,
} from "@/components/admin/admin-ui";

type UserRow = {
  id: string;
  email: string;
  handle: string | null;
  displayName: string | null;
  role: string;
  status: string;
  isVerified: boolean;
  trustScore: number;
  warningCount: number;
  createdAt: string;
};

function UsersPageInner() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [selected, setSelected] = useState<string | null>(
    searchParams.get("focus"),
  );
  const [message, setMessage] = useState<string | null>(null);
  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    return `/api/admin/users?${p.toString()}`;
  }, [q, status]);
  const { data, loading, error, reload } = useAdminJson<{ users: UserRow[] }>(url);
  const [detailData, setDetailData] = useState<{
    user: UserRow & { bio?: string; warningCount: number };
    notes: Array<{ body: string; createdAt: string }>;
    loginHistory: Array<{
      success: boolean;
      ip: string | null;
      createdAt: string;
    }>;
    devices: Array<{
      deviceLabel: string | null;
      ip: string | null;
      lastActiveAt: string;
    }>;
  } | null>(null);

  async function loadDetail(userId: string) {
    setSelected(userId);
    const res = await adminPost("/api/admin/users", { userId, action: "get" });
    setDetailData(res);
  }

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus) void loadDetail(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate detail from URL focus
  }, [searchParams]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    try {
      await adminPost("/api/admin/users", {
        userId: selected,
        action,
        ...extra,
      });
      setMessage(`Action ${action} completed`);
      await reload();
      await loadDetail(selected);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Users"
        subtitle="Search, filter, edit, suspend, ban, verify, and review history."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, handle, name…"
          className="min-w-[220px] flex-1 rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--signal)]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
        </select>
      </div>
      {message ? (
        <p className="mb-3 text-sm text-[var(--signal-deep)]">{message}</p>
      ) : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              <tr>
                <th className="pb-3">User</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Trust</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => void loadDetail(u.id)}
                  className={`cursor-pointer border-t-2 border-[var(--mist-strong)] ${
                    selected === u.id
                      ? "bg-[var(--signal)]/15"
                      : "hover:bg-[var(--surface)]"
                  }`}
                >
                  <td className="py-3">
                    <div className="font-medium">
                      {u.displayName || u.handle || "—"}
                      {u.isVerified ? " ✓" : ""}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      @{u.handle || "—"} · {u.email}
                    </div>
                  </td>
                  <td className="py-3">{u.role}</td>
                  <td className="py-3">{u.status}</td>
                  <td className="py-3">{u.trustScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel>
          {!selected ? (
            <p className="text-sm text-[var(--muted)]">
              Select a user to manage.
            </p>
          ) : !detailData ? (
            <p className="text-sm text-[var(--muted)]">Loading detail…</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-xl font-semibold">
                  {detailData.user.displayName || detailData.user.handle}
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  {detailData.user.email} · warnings{" "}
                  {detailData.user.warningCount}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["suspend", "Suspend"],
                  ["ban", "Temp ban"],
                  ["unban", "Unban"],
                  ["verify", "Verify"],
                  ["unverify", "Remove verify"],
                  ["reset_2fa", "Reset 2FA"],
                  ["logout_all", "Logout all"],
                  ["delete", "Delete"],
                ].map(([action, label]) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() =>
                      void act(
                        action,
                        action === "ban"
                          ? { permanent: false, reason: "Policy" }
                          : {},
                      )
                    }
                    className="rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs hover:border-[var(--ink)]"
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    void act("ban", {
                      permanent: true,
                      reason: "Permanent ban",
                    })
                  }
                  className="rounded-full bg-[var(--ember)] px-3 py-1.5 text-xs text-white"
                >
                  Permanent ban
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reason = window.prompt("Warning reason");
                    if (reason) void act("warn", { reason });
                  }}
                  className="rounded-full border-2 border-[var(--mist-strong)] px-3 py-1.5 text-xs"
                >
                  Warn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const body = window.prompt("Staff note");
                    if (body) void act("note", { body });
                  }}
                  className="rounded-full border-2 border-[var(--mist-strong)] px-3 py-1.5 text-xs"
                >
                  Add note
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const password = window.prompt(
                      "New temporary password (min 8)",
                    );
                    if (password) void act("reset_password", { password });
                  }}
                  className="rounded-full border-2 border-[var(--mist-strong)] px-3 py-1.5 text-xs"
                >
                  Reset password
                </button>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Notes
                </h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {detailData.notes.map((n, i) => (
                    <li
                      key={i}
                      className="rounded-xl bg-[var(--surface)] px-3 py-2"
                    >
                      {n.body}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Login history
                </h3>
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-[var(--muted)]">
                  {detailData.loginHistory.map((l, i) => (
                    <li key={i}>
                      {l.success ? "OK" : "FAIL"} · {l.ip || "—"} ·{" "}
                      {new Date(l.createdAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Devices
                </h3>
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-[var(--muted)]">
                  {detailData.devices.map((d, i) => (
                    <li key={i}>
                      {d.deviceLabel || "Device"} · {d.ip || "—"} ·{" "}
                      {new Date(d.lastActiveAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <UsersPageInner />
    </Suspense>
  );
}
