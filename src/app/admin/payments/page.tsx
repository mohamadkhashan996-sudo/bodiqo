"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type PaypalForm = {
  enabled: boolean;
  mode: "sandbox" | "live";
  businessEmail: string;
  clientId: string;
  clientSecret: string;
  brandName: string;
  connectedAt: string;
};

export default function PaymentsSettingsPage() {
  const [form, setForm] = useState<PaypalForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setForm({
          enabled: Boolean(d.paypal?.enabled),
          mode: d.paypal?.mode === "live" ? "live" : "sandbox",
          businessEmail: String(d.paypal?.businessEmail || ""),
          clientId: String(d.paypal?.clientId || ""),
          clientSecret: String(d.paypal?.clientSecret || ""),
          brandName: String(d.paypal?.brandName || "BODIQO"),
          connectedAt: String(d.paypal?.connectedAt || ""),
        });
      })
      .catch(() => setMessage("Failed to load payment settings"));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage(null);
    const payload = {
      ...form,
      connectedAt: form.clientId && form.clientSecret ? new Date().toISOString() : form.connectedAt,
    };
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "paypal", value: payload }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Save failed");
      return;
    }
    setForm((prev) => (prev ? { ...prev, ...data.value } : prev));
    setMessage(
      form.enabled
        ? "PayPal connected & saved. Payments go to your Business account."
        : "Payment settings saved (PayPal disabled).",
    );
  }

  if (!form) {
    return <p className="text-sm text-[#f3efe6]/55">Loading payments…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] text-[#d4b483] uppercase">
          Settings → Payments
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          Payments
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          اربط PayPal Business مرة واحدةحدة — المال يذهب لحسابك والطلب يصبح مدفوع
          بدون تعديل أي كود.
        </p>
      </div>

      <form
        onSubmit={onSave}
        className="space-y-5 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) =>
              setForm((p) => (p ? { ...p, enabled: e.target.checked } : p))
            }
            className="accent-[#d4b483]"
          />
          Enable PayPal Checkout
        </label>

        <label className="block text-sm">
          <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
            Mode
          </span>
          <select
            value={form.mode}
            onChange={(e) =>
              setForm((p) =>
                p
                  ? { ...p, mode: e.target.value as "sandbox" | "live" }
                  : p,
              )
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
          >
            <option value="sandbox">Sandbox (testing)</option>
            <option value="live">Live (real money)</option>
          </select>
        </label>

        <Field
          label="PayPal Business Email"
          value={form.businessEmail}
          onChange={(v) => setForm((p) => (p ? { ...p, businessEmail: v } : p))}
          placeholder="business@email.com"
        />
        <Field
          label="Client ID"
          value={form.clientId}
          onChange={(v) => setForm((p) => (p ? { ...p, clientId: v } : p))}
        />
        <Field
          label="Client Secret"
          value={form.clientSecret}
          onChange={(v) => setForm((p) => (p ? { ...p, clientSecret: v } : p))}
          type="password"
        />
        <Field
          label="Brand name on PayPal"
          value={form.brandName}
          onChange={(v) => setForm((p) => (p ? { ...p, brandName: v } : p))}
        />

        {form.connectedAt ? (
          <p className="text-xs text-[#8fdfb0]">
            Connected: {new Date(form.connectedAt).toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-[#f3efe6]/40">
            Not connected yet — paste Client ID + Secret from PayPal Developer
            Dashboard, then Save.
          </p>
        )}

        {message ? <p className="text-sm text-[#d4b483]">{message}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#d4b483] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase disabled:opacity-60"
          >
            {saving ? "Saving…" : "Connect & Save"}
          </button>
          <Link
            href="/admin/settings"
            className="rounded-full border border-white/15 px-6 py-3 text-[11px] tracking-[0.16em] text-[#f3efe6]/70 uppercase"
          >
            All settings
          </Link>
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 p-5 text-sm text-[#f3efe6]/55">
        <p className="text-[11px] tracking-[0.16em] text-[#d4b483] uppercase">
          How it works
        </p>
        <ol className="mt-3 list-decimal space-y-2 ps-5">
          <li>Create a REST app in PayPal Developer Dashboard</li>
          <li>Paste Client ID + Secret here and enable Live when ready</li>
          <li>Customer pays → money to your PayPal Business → order = Paid</li>
        </ol>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 outline-none focus:border-[#d4b483]"
      />
    </label>
  );
}
