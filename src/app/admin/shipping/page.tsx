"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function ShippingSettingsPage() {
  const [form, setForm] = useState({
    flatRate: "29.9",
    freeThreshold: "250",
    estimatedDaysMin: "3",
    estimatedDaysMax: "7",
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setForm({
          flatRate: String(d.shipping?.flatRate ?? 29.9),
          freeThreshold: String(d.shipping?.freeThreshold ?? 250),
          estimatedDaysMin: String(d.shipping?.estimatedDaysMin ?? 3),
          estimatedDaysMax: String(d.shipping?.estimatedDaysMax ?? 7),
        });
      });
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "shipping",
        value: {
          flatRate: Number(form.flatRate),
          freeThreshold: Number(form.freeThreshold),
          estimatedDaysMin: Number(form.estimatedDaysMin),
          estimatedDaysMax: Number(form.estimatedDaysMax),
          countries: ["IL"],
        },
      }),
    });
    setMessage(res.ok ? "Shipping settings saved." : "Save failed");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] text-[#4a8cff] uppercase">
          Settings → Shipping
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          Shipping
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          أسعار الشحن وعتبة الشحن المجاني بدون كود
        </p>
      </div>

      <form
        onSubmit={onSave}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        {(
          [
            ["flatRate", "Flat shipping rate"],
            ["freeThreshold", "Free shipping threshold"],
            ["estimatedDaysMin", "Min delivery days"],
            ["estimatedDaysMax", "Max delivery days"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
              {label}
            </span>
            <input
              type="number"
              step="any"
              value={form[key]}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
            />
          </label>
        ))}
        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
          >
            Save shipping
          </button>
          <Link
            href="/admin/settings"
            className="rounded-full border border-white/15 px-6 py-3 text-[11px] tracking-[0.16em] uppercase"
          >
            All settings
          </Link>
        </div>
      </form>
    </div>
  );
}
