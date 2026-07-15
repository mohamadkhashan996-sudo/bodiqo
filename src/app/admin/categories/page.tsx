"use client";

import { FormEvent, useEffect, useState } from "react";

type Category = { id: string; name: string; slug: string; enabled: boolean };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data.categories || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
      }),
    });
    if (!res.ok) {
      setMessage("Failed to create category");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setMessage("Category created");
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        Categories
      </h1>
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
          name="description"
          placeholder="Description"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Add category
        </button>
        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      </form>
      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span>{c.name}</span>
            <span className="text-[#f3efe6]/40">{c.slug}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
