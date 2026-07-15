"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Supplier = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  defaultShippingDays: number;
  currency: string;
  enabled: boolean;
  _count?: { products: number };
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/suppliers");
    const data = await res.json();
    setSuppliers(data.suppliers || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        website: form.get("website"),
        notes: form.get("notes"),
        defaultShippingDays: Number(form.get("defaultShippingDays") || 12),
        currency: form.get("currency") || "USD",
      }),
    });
    if (!res.ok) {
      setMessage("Failed to create supplier");
      return;
    }
    setMessage("Supplier created");
    (e.target as HTMLFormElement).reset();
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Suppliers
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Manage AliExpress and other vendor sources for dropshipping.
        </p>
        <Link
          href="/admin/dropship"
          className="mt-3 inline-block text-xs tracking-[0.14em] text-[#d4b483] uppercase"
        >
          ← Dropship hub
        </Link>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <input
          name="name"
          required
          placeholder="Supplier name"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="website"
          placeholder="Website"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="notes"
          placeholder="Notes"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="defaultShippingDays"
            type="number"
            defaultValue={12}
            placeholder="Shipping days"
            className="rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
          />
          <input
            name="currency"
            defaultValue="USD"
            placeholder="Currency"
            className="rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-[#d4b483] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Add supplier
        </button>
        {message ? <p className="text-sm text-[#d4b483]">{message}</p> : null}
      </form>

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {suppliers.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div>
              <p className="text-[#f3efe6]">{s.name}</p>
              <p className="text-xs text-[#f3efe6]/40">
                {s._count?.products ?? 0} products · {s.defaultShippingDays}d ·{" "}
                {s.currency}
              </p>
            </div>
            {s.website ? (
              <a
                href={s.website}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#d4b483]"
              >
                Site
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
