"use client";

import { FormEvent, useEffect, useState } from "react";

type TaxRate = {
  id: string;
  name: string;
  country: string;
  region: string | null;
  rate: string;
  enabled: boolean;
};

export default function AdminTaxesPage() {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/taxes");
    const data = await res.json();
    setRates(data.rates || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/taxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        country: form.get("country"),
        region: form.get("region") || null,
        rate: Number(form.get("rate")),
        enabled: form.get("enabled") === "on",
      }),
    });
    if (!res.ok) {
      setMessage("Failed to create tax rate");
      return;
    }
    setMessage("Tax rate created");
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function toggleEnabled(rate: TaxRate) {
    await fetch(`/api/admin/taxes/${rate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rate.enabled }),
    });
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this tax rate?")) return;
    await fetch(`/api/admin/taxes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">Taxes</h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Manage regional tax rates applied at checkout.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <input
          name="name"
          required
          placeholder="Name (e.g. VAT)"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="country"
          required
          placeholder="Country code (e.g. IL)"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm uppercase"
        />
        <input
          name="region"
          placeholder="Region (optional)"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="rate"
          type="number"
          required
          step="any"
          min={0}
          placeholder="Rate (e.g. 17 for 17%)"
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
          Add tax rate
        </button>
        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      </form>

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {rates.map((rate) => (
          <li
            key={rate.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{rate.name}</p>
              <p className="text-xs text-[#f3efe6]/40">
                {rate.country}
                {rate.region ? ` · ${rate.region}` : ""} · {rate.rate}%
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleEnabled(rate)}
                className={rate.enabled ? "text-[#8fdfb0]" : "text-[#f3efe6]/40"}
              >
                {rate.enabled ? "Enabled" : "Disabled"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(rate.id)}
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
