"use client";

import { useState } from "react";
import {
  AdminPageHeader,
  Panel,
  adminPost,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminContentPage() {
  const [kind, setKind] = useState("posts");
  const { data, loading, error, reload } = useAdminJson<{
    items: Array<Record<string, unknown>>;
    hashtags: Array<{ tag: string; count: number }>;
  }>(`/api/admin/content?kind=${kind}`);

  async function moderate(target: string, id: string, action: string) {
    await adminPost("/api/admin/content", { target, id, action });
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Content management"
        subtitle="Posts, stories, videos, comments, communities, hashtags, and deleted items."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {["posts", "videos", "stories", "comments", "communities", "deleted"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-wide ${kind === k ? "bg-[var(--ink)] text-[var(--cloud)]" : "border border-[var(--mist)] bg-white/60"}`}
          >
            {k}
          </button>
        ))}
      </div>
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Panel className="space-y-3">
          {data?.items?.map((item) => {
            const id = String(item.id);
            const body =
              String(item.body ?? item.name ?? item.textOverlay ?? item.mediaUrl ?? id).slice(0, 160);
            return (
              <div
                key={id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--mist)] bg-white/55 px-4 py-3"
              >
                <div>
                  <p className="text-sm">{body}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {kind === "posts" || kind === "videos" || kind === "deleted" ? (
                    <>
                      {kind !== "deleted" ? (
                        <>
                          <button type="button" className="text-xs underline" onClick={() => void moderate("post", id, "pin")}>Pin</button>
                          <button type="button" className="text-xs underline" onClick={() => void moderate("post", id, "unpin")}>Unpin</button>
                          <button type="button" className="text-xs text-[var(--ember)] underline" onClick={() => void moderate("post", id, "delete")}>Delete</button>
                        </>
                      ) : (
                        <button type="button" className="text-xs underline" onClick={() => void moderate("post", id, "restore")}>Restore</button>
                      )}
                    </>
                  ) : null}
                  {kind === "comments" ? (
                    <button type="button" className="text-xs text-[var(--ember)] underline" onClick={() => void moderate("comment", id, "delete")}>Delete</button>
                  ) : null}
                  {kind === "stories" ? (
                    <button type="button" className="text-xs text-[var(--ember)] underline" onClick={() => void moderate("story", id, "delete")}>Delete</button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </Panel>
        <Panel>
          <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">Trending hashtags</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data?.hashtags?.map((h) => (
              <li key={h.tag} className="flex justify-between">
                <span>{h.tag}</span>
                <span className="text-[var(--muted)]">{h.count}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
