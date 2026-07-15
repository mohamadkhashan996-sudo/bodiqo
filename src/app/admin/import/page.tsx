"use client";

import { FormEvent, useState } from "react";

export default function AdminImportPage() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/import", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setResult(data.error || "Import failed");
      return;
    }
    setResult(
      `Imported ${data.success}/${data.total} rows (${data.errors} errors).`,
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Import
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Migrate products from Shopify / DSers exports or any CSV catalog.
          Architecture is ready for future supplier APIs.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <label className="block">
          <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
            Format
          </span>
          <select
            name="type"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
          >
            <option value="csv">CSV (Shopify export / generic)</option>
            <option value="shopify-json">Shopify products.json</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
            File
          </span>
          <input
            name="file"
            type="file"
            accept=".csv,.json,text/csv,application/json"
            required
            className="mt-2 w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[#d4b483] file:px-4 file:py-2 file:text-[11px] file:font-semibold file:tracking-[0.12em] file:text-[#0b0b0b] file:uppercase"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#d4b483] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase disabled:opacity-60"
        >
          {loading ? "Importing…" : "Run import"}
        </button>
        {result ? <p className="text-sm text-[#d4b483]">{result}</p> : null}
      </form>

      <div className="rounded-2xl border border-white/10 p-5 text-sm text-[#f3efe6]/55">
        <p className="text-[11px] tracking-[0.16em] text-[#d4b483] uppercase">
          Tip
        </p>
        <p className="mt-2">
          From Shopify: Products → Export CSV, or download{" "}
          <code className="text-[#f3efe6]/80">/products.json</code> from your
          store. DSers-managed products appear in that Shopify catalog export.
        </p>
      </div>
    </div>
  );
}
