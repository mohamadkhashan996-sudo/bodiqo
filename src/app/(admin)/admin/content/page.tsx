"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  AdminPageHeader,
  adminPost,
  Panel,
  useAdminJson,
} from "@/components/admin/admin-ui";

const KINDS = [
  "posts",
  "videos",
  "stories",
  "comments",
  "messages",
  "communities",
  "deleted",
] as const;

function ContentPageInner() {
  const searchParams = useSearchParams();
  const initialKind = searchParams.get("kind");
  const [kind, setKind] = useState(
    KINDS.includes(initialKind as (typeof KINDS)[number])
      ? (initialKind as string)
      : "posts",
  );
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const qs = new URLSearchParams({ kind });
  if (q.trim()) qs.set("q", q.trim());
  const { data, loading, error, reload } = useAdminJson<{
    items: Array<Record<string, unknown>>;
    hashtags: Array<{ tag: string; count: number }>;
  }>(`/api/admin/content?${qs.toString()}`);

  async function moderate(target: string, id: string, action: string) {
    await adminPost("/api/admin/content", { target, id, action });
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Content review"
        subtitle="Moderate posts, videos, stories, comments, messages, communities, and deleted items."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-full px-4 py-2 text-xs tracking-wide uppercase ${
              kind === k
                ? "bg-[var(--ink)] text-[var(--cloud)]"
                : "border-2 border-[var(--mist-strong)] bg-[var(--surface)]"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search content…"
          className="w-full max-w-md rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--signal)]"
        />
      </div>
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <Panel className="space-y-3">
          {data?.items?.map((item) => {
            const id = String(item.id);
            const author = item.author as
              { handle?: string; displayName?: string } | undefined;
            const owner = item.owner as
              { handle?: string; displayName?: string } | undefined;
            const sender = item.sender as
              { handle?: string; displayName?: string } | undefined;
            const body = String(
              item.body ??
                item.name ??
                item.textOverlay ??
                item.mediaUrl ??
                id,
            ).slice(0, 160);
            const deletedForAll = Boolean(item.deletedForAll);
            return (
              <div
                key={id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-3"
              >
                <div>
                  <p className="text-sm">{body || (deletedForAll ? "[removed]" : id)}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {author?.handle
                      ? `@${author.handle}`
                      : sender?.handle
                        ? `@${sender.handle}`
                        : owner?.handle
                          ? `@${owner.handle}`
                          : id}
                    {kind === "posts" || kind === "videos" ? (
                      <>
                        {" · "}
                        <Link href={`/post/${id}`} className="underline">
                          Open
                        </Link>
                      </>
                    ) : null}
                    {kind === "messages" && deletedForAll ? " · moderated" : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {kind === "posts" ||
                  kind === "videos" ||
                  kind === "deleted" ? (
                    <>
                      {kind !== "deleted" ? (
                        <>
                          <button
                            type="button"
                            className="text-xs underline"
                            onClick={() => void moderate("post", id, "pin")}
                          >
                            Pin
                          </button>
                          <button
                            type="button"
                            className="text-xs underline"
                            onClick={() => void moderate("post", id, "unpin")}
                          >
                            Unpin
                          </button>
                          <button
                            type="button"
                            className="text-xs text-[var(--ember)] underline"
                            onClick={() => void moderate("post", id, "delete")}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="text-xs underline"
                          onClick={() => void moderate("post", id, "restore")}
                        >
                          Restore
                        </button>
                      )}
                    </>
                  ) : null}
                  {kind === "comments" ? (
                    <button
                      type="button"
                      className="text-xs text-[var(--ember)] underline"
                      onClick={() => void moderate("comment", id, "delete")}
                    >
                      Delete
                    </button>
                  ) : null}
                  {kind === "messages" ? (
                    deletedForAll ? (
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => void moderate("message", id, "restore")}
                      >
                        Restore flag
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-[var(--ember)] underline"
                        onClick={() => void moderate("message", id, "delete")}
                      >
                        Delete
                      </button>
                    )
                  ) : null}
                  {kind === "stories" ? (
                    <button
                      type="button"
                      className="text-xs text-[var(--ember)] underline"
                      onClick={() => void moderate("story", id, "delete")}
                    >
                      Delete
                    </button>
                  ) : null}
                  {kind === "communities" ? (
                    <>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => void moderate("community", id, "hide")}
                      >
                        Hide
                      </button>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => void moderate("community", id, "unhide")}
                      >
                        Unhide
                      </button>
                      <button
                        type="button"
                        className="text-xs text-[var(--ember)] underline"
                        onClick={() => void moderate("community", id, "delete")}
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </Panel>
        <Panel>
          <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
            Trending hashtags
          </h2>
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

export default function AdminContentPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}
    >
      <ContentPageInner />
    </Suspense>
  );
}
