"use client";

import { FormEvent, useEffect, useState } from "react";

type MenuItem = {
  id: string;
  label: string;
  href: string;
  sortOrder: number;
  enabled: boolean;
  location: string;
};

export default function AdminMenusPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [location, setLocation] = useState("header");

  async function load() {
    const res = await fetch(`/api/admin/menus?location=${location}`);
    const data = await res.json();
    setItems(data.all || []);
  }

  useEffect(() => {
    load();
  }, [location]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.get("label"),
        href: form.get("href"),
        sortOrder: Number(form.get("sortOrder") || 0),
        location: form.get("location"),
        enabled: form.get("enabled") === "on",
      }),
    });
    if (!res.ok) {
      setMessage("Failed to create menu item");
      return;
    }
    setMessage("Menu item created");
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function toggleEnabled(item: MenuItem) {
    await fetch(`/api/admin/menus/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this menu item?")) return;
    await fetch(`/api/admin/menus/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Menus
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Configure header and footer navigation links.
        </p>
      </div>

      <div className="flex gap-2">
        {["header", "footer"].map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => setLocation(loc)}
            className={
              location === loc
                ? "rounded-full bg-[#4a8cff] px-4 py-2 text-xs tracking-[0.12em] text-[#0b0b0b] uppercase"
                : "rounded-full border border-white/15 px-4 py-2 text-xs tracking-[0.12em] text-[#f3efe6]/70 uppercase"
            }
          >
            {loc}
          </button>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <input
          name="label"
          required
          placeholder="Label"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="href"
          required
          placeholder="Link (e.g. /shop)"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="sortOrder"
          type="number"
          defaultValue={0}
          placeholder="Sort order"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <select
          name="location"
          defaultValue={location}
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        >
          <option value="header">Header</option>
          <option value="footer">Footer</option>
        </select>
        <label className="flex items-center gap-3 text-sm">
          <input name="enabled" type="checkbox" defaultChecked className="accent-[#4a8cff]" />
          Enabled
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Add menu item
        </button>
        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      </form>

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {items
          .filter((i) => i.location === location)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-[#f3efe6]/40">
                  {item.href} · order {item.sortOrder}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleEnabled(item)}
                  className={item.enabled ? "text-[#8fdfb0]" : "text-[#f3efe6]/40"}
                >
                  {item.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
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
