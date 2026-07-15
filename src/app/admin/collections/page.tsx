"use client";

import { FormEvent, useEffect, useState } from "react";

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
  _count?: { products: number };
};

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/collections");
    const data = await res.json();
    setCollections(data.collections || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug") || undefined,
        description: form.get("description") || null,
        enabled: form.get("enabled") === "on",
        sortOrder: Number(form.get("sortOrder") || 0),
      }),
    });
    if (!res.ok) {
      setMessage("Failed to create collection");
      return;
    }
    setMessage("Collection created");
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function toggleEnabled(c: Collection) {
    await fetch(`/api/admin/collections/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !c.enabled }),
    });
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this collection?")) return;
    await fetch(`/api/admin/collections/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Collections
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Curated product groups for homepage and shop highlights.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <input
          name="name"
          required
          placeholder="Name"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="slug"
          placeholder="Slug (optional)"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <textarea
          name="description"
          rows={2}
          placeholder="Description"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="sortOrder"
          type="number"
          defaultValue={0}
          placeholder="Sort order"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <label className="flex items-center gap-3 text-sm">
          <input name="enabled" type="checkbox" defaultChecked className="accent-[#4a8cff]" />
          Enabled
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Add collection
        </button>
        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      </form>

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {collections.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-[#f3efe6]/40">
                {c.slug} · {c._count?.products ?? 0} products
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleEnabled(c)}
                className={c.enabled ? "text-[#8fdfb0]" : "text-[#f3efe6]/40"}
              >
                {c.enabled ? "Enabled" : "Disabled"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
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
