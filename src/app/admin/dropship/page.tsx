"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type DropshipProduct = {
  id: string;
  title: string;
  slug: string;
  price: number;
  costPrice: number | null;
  markupPercent: number;
  inventory: number;
  enabled: boolean;
  supplierProductUrl: string | null;
  supplier?: { name: string } | null;
  variants: { id: string; title: string; inventory: number }[];
};

export default function DropshipHubPage() {
  const [products, setProducts] = useState<DropshipProduct[]>([]);
  const [url, setUrl] = useState("");
  const [markup, setMarkup] = useState("40");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ unfulfilled: 0 });

  async function load() {
    const [pRes, oRes] = await Promise.all([
      fetch("/api/admin/dropship/products"),
      fetch("/api/admin/dropship/orders?fulfillStatus=UNFULFILLED"),
    ]);
    const pData = await pRes.json();
    const oData = await oRes.json();
    setProducts(pData.products || []);
    setStats({ unfulfilled: (oData.orders || []).length });
  }

  useEffect(() => {
    load();
  }, []);

  async function importUrl(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/dropship/aliexpress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        markupPercent: Number(markup) || 40,
        publish: false,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Import failed");
      return;
    }
    setMessage(
      data.updated
        ? "Existing product updated from AliExpress URL."
        : "Product imported as draft. Edit & publish when ready.",
    );
    setUrl("");
    load();
  }

  async function importCsv(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    form.set("markupPercent", markup);
    form.set("publish", "false");
    const res = await fetch("/api/admin/dropship/import-csv", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "CSV import failed");
      return;
    }
    setMessage(`CSV import: ${data.success}/${data.total} products saved.`);
    load();
  }

  async function saveRow(p: DropshipProduct) {
    const res = await fetch("/api/admin/dropship/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recalculateFromCost: false,
        updates: [
          {
            id: p.id,
            inventory: p.inventory,
            price: p.price,
            costPrice: p.costPrice,
            markupPercent: p.markupPercent,
            enabled: p.enabled,
          },
        ],
      }),
    });
    if (!res.ok) {
      setMessage("Failed to save product");
      return;
    }
    setMessage(`Saved ${p.title}`);
  }

  async function recalcFromCost(p: DropshipProduct) {
    const res = await fetch("/api/admin/dropship/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recalculateFromCost: true,
        updates: [
          {
            id: p.id,
            costPrice: p.costPrice,
            markupPercent: p.markupPercent,
          },
        ],
      }),
    });
    if (res.ok) {
      setMessage("Retail price recalculated from cost + markup");
      load();
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[11px] tracking-[0.2em] text-[#4a8cff] uppercase">
          Dropshipping
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          Dropship hub
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#f3efe6]/55">
          Internal AliExpress / supplier management — import products, edit
          pricing, track supplier links, and export fulfillment orders. No
          Shopify or DSers required.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Dropship products"
          value={String(products.length)}
          href="/admin/dropship"
        />
        <Stat
          label="Unfulfilled orders"
          value={String(stats.unfulfilled)}
          href="/admin/dropship/orders"
        />
        <Stat label="Suppliers" value="Manage" href="/admin/suppliers" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={importUrl}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
        >
          <h2 className="text-[11px] tracking-[0.18em] text-[#4a8cff] uppercase">
            Import by AliExpress URL
          </h2>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://www.aliexpress.com/item/....html"
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
          />
          <label className="block text-sm">
            <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
              Markup %
            </span>
            <input
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              type="number"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase disabled:opacity-60"
          >
            {loading ? "Importing…" : "Import product"}
          </button>
          <p className="text-xs text-[#f3efe6]/40">
            Saves supplier link + draft product. Edit title, images, and price
            before enabling in storefront.
          </p>
        </form>

        <form
          onSubmit={importCsv}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
        >
          <h2 className="text-[11px] tracking-[0.18em] text-[#4a8cff] uppercase">
            Import CSV
          </h2>
          <input
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="w-full text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full border border-[#4a8cff]/50 px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#4a8cff] uppercase disabled:opacity-60"
          >
            Upload CSV
          </button>
          <p className="text-xs leading-relaxed text-[#f3efe6]/40">
            Columns: title, description, price, cost, markup, inventory, image,
            sku, supplier_url, supplier_sku, supplier, variant
          </p>
          <Link
            href="/admin/dropship/orders"
            className="inline-block text-xs tracking-[0.14em] text-[#4a8cff] uppercase"
          >
            Export supplier orders →
          </Link>
        </form>
      </div>

      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#121212] px-4 py-3">
          <h2 className="text-[11px] tracking-[0.16em] uppercase">
            Catalog & inventory
          </h2>
          <button
            type="button"
            onClick={() => load()}
            className="text-xs text-[#f3efe6]/45 hover:text-[#4a8cff]"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
              <tr>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Cost</th>
                <th className="px-3 py-3">Markup</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">Live</th>
                <th className="px-3 py-3">Supplier</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-[#f3efe6] hover:text-[#4a8cff]"
                    >
                      {p.title}
                    </Link>
                    <p className="text-[11px] text-[#f3efe6]/35">
                      {p.variants.length} variants
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      step="any"
                      value={p.costPrice ?? ""}
                      onChange={(e) => {
                        const next = [...products];
                        next[idx] = {
                          ...p,
                          costPrice: e.target.value
                            ? Number(e.target.value)
                            : null,
                        };
                        setProducts(next);
                      }}
                      className="w-24 rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={p.markupPercent}
                      onChange={(e) => {
                        const next = [...products];
                        next[idx] = {
                          ...p,
                          markupPercent: Number(e.target.value),
                        };
                        setProducts(next);
                      }}
                      className="w-20 rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      step="any"
                      value={p.price}
                      onChange={(e) => {
                        const next = [...products];
                        next[idx] = { ...p, price: Number(e.target.value) };
                        setProducts(next);
                      }}
                      className="w-24 rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={p.inventory}
                      onChange={(e) => {
                        const next = [...products];
                        next[idx] = {
                          ...p,
                          inventory: Number(e.target.value),
                        };
                        setProducts(next);
                      }}
                      className="w-20 rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => {
                        const next = [...products];
                        next[idx] = { ...p, enabled: e.target.checked };
                        setProducts(next);
                      }}
                      className="accent-[#4a8cff]"
                    />
                  </td>
                  <td className="px-3 py-3 text-xs text-[#f3efe6]/55">
                    {p.supplierProductUrl ? (
                      <a
                        href={p.supplierProductUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4a8cff] hover:underline"
                      >
                        {p.supplier?.name || "Open"}
                      </a>
                    ) : (
                      p.supplier?.name || "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => saveRow(p)}
                        className="text-[10px] tracking-[0.12em] text-[#4a8cff] uppercase"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => recalcFromCost(p)}
                        className="text-[10px] tracking-[0.12em] text-[#f3efe6]/40 uppercase"
                      >
                        Recalc
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-[#f3efe6]/45">
                    No dropship products yet. Import an AliExpress URL or CSV.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-[#121212] p-5 transition hover:border-[#4a8cff]/40"
    >
      <p className="text-[10px] tracking-[0.2em] text-[#f3efe6]/40 uppercase">
        {label}
      </p>
      <p className="mt-3 text-2xl text-[#f3efe6]">{value}</p>
    </Link>
  );
}
