"use client";

import { useState } from "react";
import { AdminPageHeader, Panel, useAdminJson } from "@/components/admin/admin-ui";

export default function AdminSearchPage() {
  const [q, setQ] = useState("");
  const { data, loading, error } = useAdminJson<{
    users: unknown[];
    posts: unknown[];
    videos: unknown[];
    communities: unknown[];
    messages: unknown[];
    comments: unknown[];
    stories: unknown[];
  }>(q.trim() ? `/api/admin/search?q=${encodeURIComponent(q.trim())}` : null);

  return (
    <div>
      <AdminPageHeader
        title="Admin search"
        subtitle="Search users, posts, videos, communities, messages, comments, and stories."
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the platform…"
        className="mb-6 w-full max-w-xl rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--signal)]"
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Searching…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      {data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["Users", data.users],
              ["Posts", data.posts],
              ["Videos", data.videos],
              ["Communities", data.communities],
              ["Messages", data.messages],
              ["Comments", data.comments],
              ["Stories", data.stories],
            ] as const
          ).map(([label, items]) => (
            <Panel key={label}>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                {label} ({items.length})
              </h2>
              <pre className="mt-3 max-h-48 overflow-auto text-[10px] leading-4 text-[var(--muted)]">
                {JSON.stringify(items, null, 2)}
              </pre>
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}
