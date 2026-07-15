"use client";

import { FormEvent, useEffect, useState } from "react";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: string;
  enabled: boolean;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/coupons");
    const data = await res.json();
    setCoupons(data.coupons || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.get("code"),
        type: form.get("type"),
        value: Number(form.get("value")),
      }),
    });
    if (!res.ok) {
      setMessage("Failed");
      return;
    }
    setMessage("Coupon created");
    (e.target as HTMLFormElement).reset();
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        Coupons
      </h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <input
          name="code"
          required
          placeholder="CODE"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 uppercase"
        />
        <select
          name="type"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
        >
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed amount</option>
        </select>
        <input
          name="value"
          type="number"
          required
          step="any"
          placeholder="Value"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
        />
        <button
          type="submit"
          className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Create coupon
        </button>
        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      </form>
      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {coupons.map((c) => (
          <li key={c.id} className="flex justify-between px-4 py-3 text-sm">
            <span className="font-medium tracking-wider">{c.code}</span>
            <span className="text-[#f3efe6]/55">
              {c.type} · {c.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
