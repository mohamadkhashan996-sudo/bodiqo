"use client";

import { useState } from "react";

import {
  AdminPageHeader,
  adminPatch,
  adminPost,
  Panel,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const { data, loading, error, reload } = useAdminJson<{
    announcements: Array<{
      id: string;
      title: string;
      body: string;
      href: string | null;
      published: boolean;
      publishedAt: string | null;
      createdAt: string;
      createdBy: { handle: string | null };
    }>;
  }>("/api/admin/announcements");

  async function create(publish: boolean) {
    await adminPost("/api/admin/announcements", {
      title,
      body,
      href: href || null,
      publish,
    });
    setTitle("");
    setBody("");
    setHref("");
    setMsg(publish ? "Published to recent active users" : "Draft saved");
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Announcements"
        subtitle="Platform-wide notices. Publishing fans out ANNOUNCEMENT notifications to recent active users."
      />
      {msg ? <p className="mb-3 text-sm text-[var(--signal-deep)]">{msg}</p> : null}
      <Panel className="mb-6 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Body"
          rows={4}
          className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <input
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="Optional link (/home)"
          className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border px-4 py-2 text-sm"
            onClick={() => void create(false).catch((e) => setMsg(String(e)))}
          >
            Save draft
          </button>
          <button
            type="button"
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--cloud)]"
            onClick={() => void create(true).catch((e) => setMsg(String(e)))}
          >
            Publish now
          </button>
        </div>
      </Panel>
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <div className="space-y-3">
        {data?.announcements.map((a) => (
          <Panel key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                  {a.published ? "Published" : "Draft"} · @
                  {a.createdBy.handle || "staff"}
                </p>
                <p className="mt-2 font-medium">{a.title}</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{a.body}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!a.published ? (
                  <button
                    type="button"
                    className="rounded-full border px-3 py-1.5 text-xs"
                    onClick={() =>
                      void adminPatch("/api/admin/announcements", {
                        id: a.id,
                        publish: true,
                      }).then(reload)
                    }
                  >
                    Publish
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-full border px-3 py-1.5 text-xs"
                    onClick={() =>
                      void adminPatch("/api/admin/announcements", {
                        id: a.id,
                        publish: false,
                      }).then(reload)
                    }
                  >
                    Unpublish
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-full border border-[var(--ember)]/40 px-3 py-1.5 text-xs text-[var(--ember)]"
                  onClick={() =>
                    void adminPatch("/api/admin/announcements", {
                      id: a.id,
                      delete: true,
                    }).then(reload)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
