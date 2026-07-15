"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "STAFF" | "ADMIN";
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRole(id: string, role: User["role"]) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to update role");
      return;
    }
    setMessage("Role updated");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Users & Roles
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Manage staff access and admin permissions.
        </p>
      </div>

      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-xs text-[#f3efe6]/40">{user.email}</p>
            </div>
            <select
              value={user.role}
              onChange={(e) =>
                updateRole(user.id, e.target.value as User["role"])
              }
              className="rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm"
            >
              <option value="USER">User</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
