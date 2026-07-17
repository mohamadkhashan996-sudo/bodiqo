"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AdminPageHeader,
  Panel,
  StatCard,
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
  banReason: string | null;
  bannedUntil: string | null;
  createdAt: string;
};

export default function AdminBannedUsersPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"BANNED" | "SUSPENDED" | "BOTH">(
    "BANNED",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const overview = useAdminJson<{
    totals: { bannedUsers?: number; suspendedUsers?: number };
  }>("/api/admin/overview");

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (filter === "BOTH") p.set("status", "BANNED,SUSPENDED");
    else p.set("status", filter);
    p.set("take", "80");
    return `/api/admin/users?${p.toString()}`;
  }, [q, filter]);

  const { data, loading, error, reload } = useAdminJson<{ users: UserRow[] }>(
    url,
  );

  useEffect(() => {
    setSelected(null);
  }, [filter, q]);

  async function restore(userId: string) {
    try {
      await adminPost("/api/admin/users", { userId, action: "unban" });
      setMessage("Access restored");
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function escalateBan(userId: string) {
    try {
      await adminPost("/api/admin/users", {
        userId,
        action: "ban",
        permanent: true,
        reason: "Escalated from suspension",
      });
      setMessage("User permanently banned");
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function loadDetail(userId: string) {
    setSelected(userId);
    try {
      const detail = await adminPost("/api/admin/users", {
        userId,
        action: "get",
      });
      const user = detail.user as UserRow;
      setMessage(
        [
          user.banReason ? `Reason: ${user.banReason}` : null,
          user.bannedUntil
            ? `Until: ${new Date(user.bannedUntil).toLocaleString()}`
            : user.status === "BANNED"
              ? "Permanent ban"
              : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      );
    } catch {
      /* ignore */
    }
  }

  const users = data?.users ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Banned users"
        subtitle="Review banned and suspended accounts, restore access, or escalate enforcement."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Banned"
          value={overview.data?.totals.bannedUsers ?? "—"}
        />
        <StatCard
          label="Suspended"
          value={overview.data?.totals.suspendedUsers ?? "—"}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["BANNED", "Banned"],
            ["SUSPENDED", "Suspended"],
            ["BOTH", "All enforced"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-wide ${
              filter === value
                ? "bg-[var(--ink)] text-[var(--cloud)]"
                : "border-2 border-[var(--mist-strong)] bg-[var(--surface)]"
            }`}
          >
            {label}
          </button>
        ))}
        <Link
          href="/admin/users"
          className="rounded-full border-2 border-[var(--mist-strong)] px-4 py-2 text-xs uppercase tracking-wide"
        >
          All users
        </Link>
      </div>

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search banned or suspended…"
          className="w-full max-w-md rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--signal)]"
        />
      </div>

      {message ? (
        <p className="mb-3 text-sm text-[var(--signal-deep)]">{message}</p>
      ) : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            <tr>
              <th className="pb-3">User</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Trust</th>
              <th className="pb-3">Warnings</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className={`border-t-2 border-[var(--mist-strong)] ${
                  selected === u.id ? "bg-[var(--signal)]/10" : ""
                }`}
              >
                <td className="py-3">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => void loadDetail(u.id)}
                  >
                    <div className="font-medium">
                      {u.displayName || u.handle || "—"}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      @{u.handle || "—"} · {u.email}
                    </div>
                  </button>
                </td>
                <td className="py-3">
                  <span
                    className={
                      u.status === "BANNED"
                        ? "text-[var(--ember)]"
                        : "text-[var(--ink)]"
                    }
                  >
                    {u.status}
                  </span>
                </td>
                <td className="py-3">{u.trustScore}</td>
                <td className="py-3">{u.warningCount}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border-2 border-[var(--mist-strong)] px-3 py-1 text-xs hover:border-[var(--signal)]"
                      onClick={() => void restore(u.id)}
                    >
                      Restore
                    </button>
                    {u.status === "SUSPENDED" ? (
                      <button
                        type="button"
                        className="rounded-full bg-[var(--ember)] px-3 py-1 text-xs text-white"
                        onClick={() => void escalateBan(u.id)}
                      >
                        Ban
                      </button>
                    ) : null}
                    <Link
                      href={`/admin/users?focus=${u.id}&status=${u.status}`}
                      className="rounded-full border-2 border-[var(--mist-strong)] px-3 py-1 text-xs"
                    >
                      Details
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !users.length ? (
          <p className="py-6 text-sm text-[var(--muted)]">
            No enforced accounts in this queue.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
