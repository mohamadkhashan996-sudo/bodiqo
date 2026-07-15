"use client";

import { FormEvent, useEffect, useState } from "react";

type AllSettings = {
  store: Record<string, unknown>;
  paypal: Record<string, unknown>;
  smtp: Record<string, unknown>;
  shipping: Record<string, unknown>;
  seo: Record<string, unknown>;
  homepage: Record<string, unknown>;
};

const tabs = [
  { id: "store", label: "Store" },
  { id: "paypal", label: "PayPal" },
  { id: "smtp", label: "Email (SMTP)" },
  { id: "shipping", label: "Shipping" },
  { id: "homepage", label: "Homepage" },
  { id: "seo", label: "SEO" },
] as const;

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("store");
  const [data, setData] = useState<AllSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then(setData)
      .catch(() =>
        setMessage("Failed to load settings. Is the database running?"),
      );
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { ...data[tab] };

    for (const [key, value] of form.entries()) {
      if (key.startsWith("_")) continue;
      if (value === "on" || value === "off") continue;
      const el = e.currentTarget.elements.namedItem(key) as
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (el && el instanceof HTMLInputElement && el.type === "checkbox") {
        payload[key] = el.checked;
      } else if (el && el instanceof HTMLInputElement && el.type === "number") {
        payload[key] = Number(value);
      } else {
        payload[key] = String(value);
      }
    }

    // checkboxes not in FormData when unchecked
    e.currentTarget
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((cb) => {
        payload[cb.name] = cb.checked;
      });

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: tab, value: payload }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(json.error || "Save failed");
      return;
    }
    setData((prev) => (prev ? { ...prev, [tab]: json.value } : prev));
    setMessage("Settings saved.");
  }

  if (!data) {
    return (
      <div className="text-sm text-[#f3efe6]/55">
        {message || "Loading settings…"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Configure PayPal, email, shipping, language, currency, and store
          details without changing code.
        </p>
        <p className="mt-1 text-sm text-[#f3efe6]/45" dir="rtl">
          اضبط إعدادات المتجر والبريد والشحن وPayPal من هنا دون تعديل الكود.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setMessage(null);
            }}
            className={
              tab === t.id
                ? "rounded-full bg-[#4a8cff] px-4 py-2 text-xs tracking-[0.12em] text-[#0b0b0b] uppercase"
                : "rounded-full border border-white/15 px-4 py-2 text-xs tracking-[0.12em] text-[#f3efe6]/70 uppercase"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        key={tab}
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        {tab === "store" && (
          <>
            <Field
              name="storeName"
              label="Store name"
              defaultValue={String(data.store.storeName ?? "")}
            />
            <Field
              name="storeTagline"
              label="Tagline"
              defaultValue={String(data.store.storeTagline ?? "")}
            />
            <Field
              name="supportEmail"
              label="Support email"
              defaultValue={String(data.store.supportEmail ?? "")}
            />
            <Field
              name="domain"
              label="Domain"
              defaultValue={String(data.store.domain ?? "")}
            />
            <Field
              name="logoUrl"
              label="Logo URL"
              defaultValue={String(data.store.logoUrl ?? "")}
            />
            <Field
              name="bannerUrl"
              label="Banner URL"
              defaultValue={String(data.store.bannerUrl ?? "")}
            />
            <Select
              name="language"
              label="Language / اللغة"
              defaultValue={String(data.store.language ?? "en")}
              options={[
                { value: "en", label: "English" },
                { value: "ar", label: "العربية" },
                { value: "he", label: "עברית" },
              ]}
            />
            <Field
              name="currency"
              label="Currency (ISO)"
              defaultValue={String(data.store.currency ?? "ILS")}
            />
            <Field
              name="currencySymbol"
              label="Currency symbol"
              defaultValue={String(data.store.currencySymbol ?? "₪")}
            />
            <Field
              name="timezone"
              label="Timezone"
              defaultValue={String(data.store.timezone ?? "")}
            />
            <Field
              name="instagram"
              label="Instagram"
              defaultValue={String(data.store.instagram ?? "")}
            />
            <Field
              name="facebook"
              label="Facebook"
              defaultValue={String(data.store.facebook ?? "")}
            />
            <Field
              name="tiktok"
              label="TikTok"
              defaultValue={String(data.store.tiktok ?? "")}
            />
            <Field
              name="whatsapp"
              label="WhatsApp"
              defaultValue={String(data.store.whatsapp ?? "")}
            />
            <Field
              name="youtube"
              label="YouTube"
              defaultValue={String(data.store.youtube ?? "")}
            />
            <p className="text-xs text-[#f3efe6]/40">
              PayPal →{" "}
              <a href="/admin/payments" className="text-[#4a8cff]">
                Payments page
              </a>{" "}
              · Shipping →{" "}
              <a href="/admin/shipping" className="text-[#4a8cff]">
                Shipping page
              </a>
            </p>
          </>
        )}

        {tab === "paypal" && (
          <>
            <Check
              name="enabled"
              label="Enable PayPal Checkout"
              defaultChecked={Boolean(data.paypal.enabled)}
            />
            <Select
              name="mode"
              label="Mode"
              defaultValue={String(data.paypal.mode ?? "sandbox")}
              options={[
                { value: "sandbox", label: "Sandbox (testing)" },
                { value: "live", label: "Live (real payments)" },
              ]}
            />
            <Field
              name="businessEmail"
              label="PayPal Business Email"
              defaultValue={String(data.paypal.businessEmail ?? "")}
            />
            <Field
              name="clientId"
              label="PayPal Client ID"
              defaultValue={String(data.paypal.clientId ?? "")}
            />
            <Field
              name="clientSecret"
              label="PayPal Client Secret"
              defaultValue={String(data.paypal.clientSecret ?? "")}
              type="password"
            />
            <Field
              name="brandName"
              label="Brand name on PayPal"
              defaultValue={String(data.paypal.brandName ?? "BODIQO")}
            />
            <p className="text-xs leading-relaxed text-[#f3efe6]/45">
              Or use the dedicated{" "}
              <a href="/admin/payments" className="text-[#4a8cff]">
                Payments
              </a>{" "}
              page. First time only — then customers pay and money goes to your
              PayPal Business account.
            </p>
          </>
        )}

        {tab === "smtp" && (
          <>
            <Check
              name="enabled"
              label="Enable transactional email"
              defaultChecked={Boolean(data.smtp.enabled)}
            />
            <Field
              name="host"
              label="SMTP host"
              defaultValue={String(data.smtp.host ?? "")}
            />
            <Field
              name="port"
              label="Port"
              type="number"
              defaultValue={String(data.smtp.port ?? 587)}
            />
            <Check
              name="secure"
              label="Use TLS/SSL"
              defaultChecked={Boolean(data.smtp.secure)}
            />
            <Field
              name="user"
              label="Username"
              defaultValue={String(data.smtp.user ?? "")}
            />
            <Field
              name="password"
              label="Password"
              type="password"
              defaultValue={String(data.smtp.password ?? "")}
            />
            <Field
              name="fromName"
              label="From name"
              defaultValue={String(data.smtp.fromName ?? "")}
            />
            <Field
              name="fromEmail"
              label="From email"
              defaultValue={String(data.smtp.fromEmail ?? "")}
            />
          </>
        )}

        {tab === "shipping" && (
          <>
            <Field
              name="flatRate"
              label="Flat shipping rate"
              type="number"
              defaultValue={String(data.shipping.flatRate ?? 29.9)}
            />
            <Field
              name="freeThreshold"
              label="Free shipping threshold"
              type="number"
              defaultValue={String(data.shipping.freeThreshold ?? 250)}
            />
            <Field
              name="estimatedDaysMin"
              label="Min delivery days"
              type="number"
              defaultValue={String(data.shipping.estimatedDaysMin ?? 3)}
            />
            <Field
              name="estimatedDaysMax"
              label="Max delivery days"
              type="number"
              defaultValue={String(data.shipping.estimatedDaysMax ?? 7)}
            />
          </>
        )}

        {tab === "homepage" && (
          <>
            <Field
              name="heroHeadline"
              label="Hero headline"
              defaultValue={String(data.homepage.heroHeadline ?? "")}
            />
            <TextArea
              name="heroSubheadline"
              label="Hero subheadline"
              defaultValue={String(data.homepage.heroSubheadline ?? "")}
            />
            <Field
              name="heroCtaLabel"
              label="CTA label"
              defaultValue={String(data.homepage.heroCtaLabel ?? "")}
            />
            <Field
              name="heroCtaHref"
              label="CTA link"
              defaultValue={String(data.homepage.heroCtaHref ?? "")}
            />
            <Field
              name="heroImageProductSlug"
              label="Hero product slug (image)"
              defaultValue={String(data.homepage.heroImageProductSlug ?? "")}
            />
          </>
        )}

        {tab === "seo" && (
          <>
            <Field
              name="defaultTitle"
              label="Default title"
              defaultValue={String(data.seo.defaultTitle ?? "")}
            />
            <TextArea
              name="defaultDescription"
              label="Default description"
              defaultValue={String(data.seo.defaultDescription ?? "")}
            />
            <Field
              name="ogImage"
              label="OG image URL"
              defaultValue={String(data.seo.ogImage ?? "")}
            />
            <Field
              name="twitterHandle"
              label="Twitter handle"
              defaultValue={String(data.seo.twitterHandle ?? "")}
            />
          </>
        )}

        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.18em] text-[#0b0b0b] uppercase disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        step={type === "number" ? "any" : undefined}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm outline-none focus:border-[#4a8cff]"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm outline-none focus:border-[#4a8cff]"
      />
    </label>
  );
}

function Select({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm outline-none focus:border-[#4a8cff]"
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

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-[#f3efe6]/80">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="size-4 accent-[#4a8cff]"
      />
      {label}
    </label>
  );
}
