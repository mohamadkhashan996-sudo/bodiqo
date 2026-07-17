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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/social/${mode}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(handle: string | null) {
    if (!handle) return;
    await fetch(`/api/users/${handle}/${mode === "blocked" ? "block" : "mute"}`, {
      method: "DELETE",
    });
    setUsers((old) => old.filter((u) => u.handle !== handle));
  }

  if (loading) {
    return <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (!users.length) {
    return (
      <p className="mt-3 text-sm text-[var(--muted)]">
        {mode === "blocked"
          ? "No blocked accounts."
          : "No muted accounts."}
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {users.map((user) => (
        <li
          key={user.id}
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--mist-strong)] px-4 py-3"
        >
          <Link href={`/u/${user.handle}`} className="flex min-w-0 items-center gap-3">
            <Avatar src={user.image} name={user.displayName ?? user.name} className="size-10" />
            <span className="min-w-0">
              <b className="block truncate text-sm">{user.displayName ?? user.name}</b>
              <small className="text-[var(--muted)]">@{user.handle}</small>
            </span>
          </Link>
          <Button
            type="button"
            variant="outline"
            className="min-h-9 px-3 text-xs"
            onClick={() => void remove(user.handle)}
          >
            {mode === "blocked" ? "Unblock" : "Unmute"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
