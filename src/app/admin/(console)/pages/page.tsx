"use client";

import { FormEvent, useEffect, useState } from "react";

type Page = {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
};

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Page | null>(null);

  async function load() {
    const res = await fetch("/api/admin/pages");
    const data = await res.json();
    setPages(data.pages || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        slug: form.get("slug") || undefined,
        content: form.get("content"),
        published: form.get("published") === "on",
      }),
    });
    if (!res.ok) {
      setMessage("Failed to create page");
      return;
    }
    setMessage("Page created");
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/pages/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        slug: form.get("slug"),
        content: form.get("content"),
        published: form.get("published") === "on",
      }),
    });
    if (!res.ok) {
      setMessage("Failed to update page");
      return;
    }
    setMessage("Page updated");
    setEditing(null);
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this page?")) return;
    await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Pages
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Edit static content pages (About, Shipping, Returns).
        </p>
      </div>

      <form
        onSubmit={editing ? onUpdate : onCreate}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <input
          name="title"
          required
          defaultValue={editing?.title}
          placeholder="Title"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="slug"
          defaultValue={editing?.slug}
          placeholder="Slug (optional)"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <textarea
          name="content"
          rows={6}
          defaultValue={editing?.content}
          placeholder="Content (HTML or markdown)"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <label className="flex items-center gap-3 text-sm">
          <input
            name="published"
            type="checkbox"
            defaultChecked={editing?.published}
            className="accent-[#4a8cff]"
          />
          Published
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
          >
            {editing ? "Update page" : "Create page"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.16em] text-[#f3efe6]/70 uppercase"
            >
              Cancel
            </button>
          ) : null}
        </div>
        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      </form>

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {pages.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-[#f3efe6]/40">
                /pages/{p.slug} · {p.published ? "Published" : "Draft"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="text-[#4a8cff] hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className="text-red-400 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
