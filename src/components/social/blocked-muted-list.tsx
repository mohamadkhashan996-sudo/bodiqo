"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type ListedUser = {
  id: string;
  handle: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
};

export function BlockedMutedList({ mode }: { mode: "blocked" | "muted" }) {
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyHandle, setBusyHandle] = useState<string | null>(null);

  const verb = mode === "blocked" ? "Unblock" : "Unmute";
  const empty =
    mode === "blocked" ? "No blocked accounts." : "No muted accounts.";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/social/${mode}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load list");
        setUsers([]);
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("Could not load list");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(handle: string | null) {
    if (!handle) return;
    const label = mode === "blocked" ? "unblock" : "unmute";
    if (!window.confirm(`${verb} @${handle}?`)) return;
    setBusyHandle(handle);
    setError(null);
    try {
      const res = await fetch(
        `/api/users/${handle}/${mode === "blocked" ? "block" : "mute"}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Could not ${label}`);
        return;
      }
      setUsers((old) => old.filter((u) => u.handle !== handle));
    } catch {
      setError(`Could not ${label}`);
    } finally {
      setBusyHandle(null);
    }
  }

  if (loading) {
    return <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div className="mt-4">
      {error ? (
        <p className="mb-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {!users.length ? (
        <p className="text-sm text-[var(--muted)]">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--mist-strong)] px-4 py-3"
            >
              <Link
                href={`/u/${user.handle}`}
                className="flex min-w-0 items-center gap-3"
              >
                <Avatar
                  src={user.image}
                  name={user.displayName ?? user.name}
                  className="size-10"
                />
                <span className="min-w-0">
                  <b className="block truncate text-sm">
                    {user.displayName ?? user.name}
                  </b>
                  <small className="text-[var(--muted)]">@{user.handle}</small>
                </span>
              </Link>
              <Button
                type="button"
                variant="outline"
                className="min-h-9 px-3 text-xs"
                disabled={busyHandle === user.handle}
                onClick={() => void remove(user.handle)}
              >
                {busyHandle === user.handle ? "…" : verb}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
