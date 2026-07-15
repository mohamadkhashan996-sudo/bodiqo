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

type StripeForm = {
  enabled: boolean;
  mode: "test" | "live";
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  applePay: boolean;
  googlePay: boolean;
};

type CryptoWallet = {
  coin: string;
  network: string;
  address: string;
  enabled: boolean;
};

type CryptoForm = {
  enabled: boolean;
  wallets: CryptoWallet[];
};

export default function PaymentsSettingsPage() {
  const [paypal, setPaypal] = useState<PaypalForm | null>(null);
  const [stripe, setStripe] = useState<StripeForm | null>(null);
  const [crypto, setCrypto] = useState<CryptoForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setPaypal({
          enabled: Boolean(d.paypal?.enabled),
          mode: d.paypal?.mode === "live" ? "live" : "sandbox",
          businessEmail: String(d.paypal?.businessEmail || ""),
          clientId: String(d.paypal?.clientId || ""),
          clientSecret: String(d.paypal?.clientSecret || ""),
          brandName: String(d.paypal?.brandName || "BODIQO"),
          connectedAt: String(d.paypal?.connectedAt || ""),
        });
        setStripe({
          enabled: Boolean(d.stripe?.enabled),
          mode: d.stripe?.mode === "live" ? "live" : "test",
          publishableKey: String(d.stripe?.publishableKey || ""),
          secretKey: String(d.stripe?.secretKey || ""),
          webhookSecret: String(d.stripe?.webhookSecret || ""),
          applePay: d.stripe?.applePay !== false,
          googlePay: d.stripe?.googlePay !== false,
        });
        setCrypto({
          enabled: Boolean(d.crypto?.enabled),
          wallets: Array.isArray(d.crypto?.wallets)
            ? d.crypto.wallets.map((w: CryptoWallet) => ({
                coin: String(w.coin || ""),
                network: String(w.network || ""),
                address: String(w.address || ""),
                enabled: Boolean(w.enabled),
              }))
            : [],
        });
      })
      .catch(() => setMessage("Failed to load payment settings"));
  }, []);

  async function saveSection(key: "paypal" | "stripe" | "crypto", value: unknown) {
    setSaving(key);
    setMessage(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    const data = await res.json();
    setSaving(null);
    if (!res.ok) {
      setMessage(data.error || "Save failed");
      return;
    }
    setMessage(`${key} settings saved.`);
    if (key === "paypal") setPaypal(data.value);
    if (key === "stripe") setStripe(data.value);
    if (key === "crypto") setCrypto(data.value);
  }

  if (!paypal || !stripe || !crypto) {
    return <p className="text-sm text-[#f3efe6]/55">Loading payments…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <p className="text-[11px] tracking-[0.2em] text-[#4a8cff] uppercase">
          Settings → Payments
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          Payments
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Configure PayPal, Stripe, and crypto checkout for your storefront.
        </p>
      </div>

      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}

      <PaypalSection
        form={paypal}
        setForm={setPaypal}
        saving={saving === "paypal"}
        onSave={(v) => saveSection("paypal", v)}
      />

      <StripeSection
        form={stripe}
        setForm={setStripe}
        saving={saving === "stripe"}
        onSave={(v) => saveSection("stripe", v)}
      />

      <CryptoSection
        form={crypto}
        setForm={setCrypto}
        saving={saving === "crypto"}
        onSave={(v) => saveSection("crypto", v)}
      />

      <div className="rounded-2xl border border-white/10 p-5 text-sm text-[#f3efe6]/55">
        <p className="text-[11px] tracking-[0.16em] text-[#4a8cff] uppercase">
          Stripe webhook
        </p>
        <p className="mt-2 font-mono text-xs break-all">
          POST /api/stripe/webhook
        </p>
        <p className="mt-2">
          Listen for <code className="text-[#f3efe6]/70">checkout.session.completed</code>
        </p>
      </div>

      <Link
        href="/admin/settings"
        className="inline-block rounded-full border border-white/15 px-6 py-3 text-[11px] tracking-[0.16em] text-[#f3efe6]/70 uppercase"
      >
        All settings
      </Link>
    </div>
  );
}

function PaypalSection({
  form,
  setForm,
  saving,
  onSave,
}: {
  form: PaypalForm;
  setForm: React.Dispatch<React.SetStateAction<PaypalForm | null>>;
  saving: boolean;
  onSave: (v: PaypalForm) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...form,
          connectedAt:
            form.clientId && form.clientSecret
              ? new Date().toISOString()
              : form.connectedAt,
        });
      }}
      className="space-y-5 rounded-2xl border border-white/10 bg-[#121212] p-6"
    >
      <h2 className="text-lg text-[#f3efe6]">PayPal</h2>
      <Toggle
        checked={form.enabled}
        onChange={(v) => setForm((p) => (p ? { ...p, enabled: v } : p))}
        label="Enable PayPal Checkout"
      />
      <SelectField
        label="Mode"
        value={form.mode}
        onChange={(v) =>
          setForm((p) => (p ? { ...p, mode: v as "sandbox" | "live" } : p))
        }
        options={[
          { value: "sandbox", label: "Sandbox" },
          { value: "live", label: "Live" },
        ]}
      />
      <Field label="Business Email" value={form.businessEmail} onChange={(v) => setForm((p) => (p ? { ...p, businessEmail: v } : p))} />
      <Field label="Client ID" value={form.clientId} onChange={(v) => setForm((p) => (p ? { ...p, clientId: v } : p))} />
      <Field label="Client Secret" value={form.clientSecret} onChange={(v) => setForm((p) => (p ? { ...p, clientSecret: v } : p))} type="password" />
      <Field label="Brand name" value={form.brandName} onChange={(v) => setForm((p) => (p ? { ...p, brandName: v } : p))} />
      <SaveButton saving={saving} />
    </form>
  );
}

function StripeSection({
  form,
  setForm,
  saving,
  onSave,
}: {
  form: StripeForm;
  setForm: React.Dispatch<React.SetStateAction<StripeForm | null>>;
  saving: boolean;
  onSave: (v: StripeForm) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-5 rounded-2xl border border-white/10 bg-[#121212] p-6"
    >
      <h2 className="text-lg text-[#f3efe6]">Stripe</h2>
      <Toggle
        checked={form.enabled}
        onChange={(v) => setForm((p) => (p ? { ...p, enabled: v } : p))}
        label="Enable Stripe Checkout"
      />
      <SelectField
        label="Mode"
        value={form.mode}
        onChange={(v) =>
          setForm((p) => (p ? { ...p, mode: v as "test" | "live" } : p))
        }
        options={[
          { value: "test", label: "Test" },
          { value: "live", label: "Live" },
        ]}
      />
      <Field label="Publishable key" value={form.publishableKey} onChange={(v) => setForm((p) => (p ? { ...p, publishableKey: v } : p))} />
      <Field label="Secret key" value={form.secretKey} onChange={(v) => setForm((p) => (p ? { ...p, secretKey: v } : p))} type="password" />
      <Field label="Webhook secret" value={form.webhookSecret} onChange={(v) => setForm((p) => (p ? { ...p, webhookSecret: v } : p))} type="password" />
      <Toggle checked={form.applePay} onChange={(v) => setForm((p) => (p ? { ...p, applePay: v } : p))} label="Apple Pay" />
      <Toggle checked={form.googlePay} onChange={(v) => setForm((p) => (p ? { ...p, googlePay: v } : p))} label="Google Pay" />
      <SaveButton saving={saving} />
    </form>
  );
}

function CryptoSection({
  form,
  setForm,
  saving,
  onSave,
}: {
  form: CryptoForm;
  setForm: React.Dispatch<React.SetStateAction<CryptoForm | null>>;
  saving: boolean;
  onSave: (v: CryptoForm) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-5 rounded-2xl border border-white/10 bg-[#121212] p-6"
    >
      <h2 className="text-lg text-[#f3efe6]">Cryptocurrency</h2>
      <Toggle
        checked={form.enabled}
        onChange={(v) => setForm((p) => (p ? { ...p, enabled: v } : p))}
        label="Enable crypto payments"
      />
      <div className="space-y-4">
        {form.wallets.map((wallet, index) => (
          <div
            key={`${wallet.coin}-${wallet.network}`}
            className="rounded-xl border border-white/8 p-4"
          >
            <p className="text-sm font-medium text-[#f3efe6]">
              {wallet.coin} · {wallet.network}
            </p>
            <Field
              label="Wallet address"
              value={wallet.address}
              onChange={(v) =>
                setForm((p) => {
                  if (!p) return p;
                  const wallets = [...p.wallets];
                  wallets[index] = { ...wallets[index], address: v };
                  return { ...p, wallets };
                })
              }
            />
            <Toggle
              checked={wallet.enabled}
              onChange={(v) =>
                setForm((p) => {
                  if (!p) return p;
                  const wallets = [...p.wallets];
                  wallets[index] = { ...wallets[index], enabled: v };
                  return { ...p, wallets };
                })
              }
              label="Enabled"
            />
          </div>
        ))}
      </div>
      <SaveButton saving={saving} />
    </form>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[#4a8cff]"
      />
      {label}
    </label>
  );
}

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase disabled:opacity-60"
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm">
      <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 outline-none focus:border-[#4a8cff]"
      />
    </label>
  );
}
