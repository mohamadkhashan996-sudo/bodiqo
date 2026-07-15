"use client";

import { FormEvent, useEffect, useState } from "react";
import type { HomepageSettings } from "@/lib/settings-schema";

export default function AdminHomepagePage() {
  const [data, setData] = useState<HomepageSettings | null>(null);
  const [sectionsJson, setSectionsJson] = useState("[]");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        const homepage = d.homepage as HomepageSettings;
        setData(homepage);
        setSectionsJson(JSON.stringify(homepage.sections ?? [], null, 2));
      })
      .catch(() => setMessage("Failed to load homepage settings"));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setMessage(null);

    let sections = data.sections;
    try {
      sections = JSON.parse(sectionsJson);
    } catch {
      setSaving(false);
      setMessage("Invalid sections JSON");
      return;
    }

    const form = new FormData(e.currentTarget);
    const payload: HomepageSettings = {
      heroHeadline: String(form.get("heroHeadline") || ""),
      heroSubheadline: String(form.get("heroSubheadline") || ""),
      heroCtaLabel: String(form.get("heroCtaLabel") || ""),
      heroCtaHref: String(form.get("heroCtaHref") || ""),
      heroImageProductSlug: String(form.get("heroImageProductSlug") || ""),
      sections,
    };

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "homepage", value: payload }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(json.error || "Save failed");
      return;
    }
    setData(json.value);
    setSectionsJson(JSON.stringify(json.value.sections ?? [], null, 2));
    setMessage("Homepage saved.");
  }

  if (!data) {
    return <p className="text-sm text-[#f3efe6]/55">Loading homepage builder…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] text-[#4a8cff] uppercase">
          Storefront → Homepage
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          Homepage Builder
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Edit hero copy and homepage sections JSON.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <Field
          name="heroHeadline"
          label="Hero headline"
          defaultValue={data.heroHeadline}
        />
        <TextArea
          name="heroSubheadline"
          label="Hero subheadline"
          defaultValue={data.heroSubheadline}
        />
        <Field
          name="heroCtaLabel"
          label="CTA label"
          defaultValue={data.heroCtaLabel}
        />
        <Field
          name="heroCtaHref"
          label="CTA link"
          defaultValue={data.heroCtaHref}
        />
        <Field
          name="heroImageProductSlug"
          label="Hero product slug"
          defaultValue={data.heroImageProductSlug}
        />

        <label className="block">
          <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
            Sections JSON
          </span>
          <textarea
            value={sectionsJson}
            onChange={(e) => setSectionsJson(e.target.value)}
            rows={12}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 font-mono text-xs outline-none focus:border-[#4a8cff]"
          />
        </label>

        <p className="text-xs text-[#f3efe6]/40">
          Section types: hero, featured, collections, banner, text. Each needs
          an id and type; optional title, subtitle, ctaLabel, ctaHref, image,
          collectionSlug.
        </p>

        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.18em] text-[#0b0b0b] uppercase disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save homepage"}
        </button>
      </form>
    </div>
  );
}

function Field({
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
      <input
        name={name}
        defaultValue={defaultValue}
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
        rows={3}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm outline-none focus:border-[#4a8cff]"
      />
    </label>
  );
}
