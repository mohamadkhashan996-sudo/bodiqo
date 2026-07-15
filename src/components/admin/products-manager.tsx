"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/catalog-types";
import {
  availableStock,
  stockBadgeClass,
  stockLabel,
  stockStatus,
} from "@/lib/inventory";

type ProductRow = {
  id: string;
  title: string;
  sku: string;
  price: number;
  inventory: number;
  reserved: number;
  soldCount: number;
  enabled: boolean;
  featured: boolean;
  inStock: boolean;
  images: string[];
  categoryName: string | null;
};

export function ProductsManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "hidden" | "oos">(
    "all",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      const status = stockStatus(p.inventory, p.reserved);
      if (filter === "active" && !p.enabled) return false;
      if (filter === "hidden" && p.enabled) return false;
      if (filter === "oos" && status !== "OUT_OF_STOCK") return false;
      if (!query) return true;
      return (
        p.title.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.categoryName || "").toLowerCase().includes(query)
      );
    });
  }, [products, q, filter]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(
    action:
      | "publish"
      | "draft"
      | "archive"
      | "delete"
      | "feature"
      | "unfeature",
  ) {
    if (!selected.size) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], action }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Bulk action failed");
      return;
    }
    setSelected(new Set());
    setMessage(`Bulk ${action} complete`);
    router.refresh();
  }

  async function duplicate(id: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/products/${id}/duplicate`, {
      method: "POST",
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Duplicate failed");
      return;
    }
    const data = await res.json();
    router.push(`/admin/products/${data.product?.id || id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">
            Products
          </h1>
          <p className="mt-2 text-sm text-[#f3efe6]/55">
            Create · edit · duplicate · bulk publish — Shopify-style catalog
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          + Add product
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products, SKU, category…"
          className="min-w-[240px] flex-1 rounded-full border border-white/10 bg-[#121212] px-5 py-3 text-sm outline-none focus:border-[#4a8cff]"
        />
        {(
          [
            ["all", "All"],
            ["active", "Published"],
            ["hidden", "Draft/Hidden"],
            ["oos", "Out of stock"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? "rounded-full bg-[#4a8cff] px-4 py-2 text-[10px] tracking-[0.14em] text-[#0b0b0b] uppercase"
                : "rounded-full border border-white/15 px-4 py-2 text-[10px] tracking-[0.14em] text-[#f3efe6]/60 uppercase"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-sm">
          <span className="text-[#f3efe6]/55">{selected.size} selected</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => bulk("publish")}
            className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase"
          >
            Publish
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => bulk("draft")}
            className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase"
          >
            Draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => bulk("feature")}
            className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase"
          >
            Feature
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => bulk("delete")}
            className="rounded-full border border-red-400/40 px-3 py-1.5 text-[10px] text-red-300 uppercase"
          >
            Delete
          </button>
        </div>
      ) : null}
      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121212] text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
            <tr>
              <th className="px-4 py-3"> </th>
              <th className="px-4 py-3">Product</th>
              <th className="hidden px-4 py-3 md:table-cell">SKU</th>
              <th className="px-4 py-3">Price</th>
              <th className="hidden px-4 py-3 lg:table-cell">Available</th>
              <th className="hidden px-4 py-3 sm:table-cell">Status</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const status = stockStatus(p.inventory, p.reserved);
              const available = availableStock(p.inventory, p.reserved);
              return (
                <tr
                  key={p.id}
                  className="border-t border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative h-12 w-10 overflow-hidden rounded-md bg-[#1a1a1a]">
                        {p.images[0] ? (
                          <Image
                            src={p.images[0]}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-[#f3efe6] hover:text-[#4a8cff]">
                          {p.featured ? "★ " : ""}
                          {p.title}
                        </p>
                        <p className="text-xs text-[#f3efe6]/40">
                          {p.categoryName || "Uncategorized"}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-[#f3efe6]/55 md:table-cell">
                    {p.sku}
                  </td>
                  <td className="px-4 py-3">{formatPrice(p.price)}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">{available}</td>
                  <td
                    className={`hidden px-4 py-3 sm:table-cell ${stockBadgeClass(status)}`}
                  >
                    {stockLabel(status)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.enabled ? "text-[#8fdfb0]" : "text-[#f3efe6]/35"
                      }
                    >
                      {p.enabled ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => duplicate(p.id)}
                        className="text-xs text-[#f3efe6]/55 hover:text-[#4a8cff]"
                      >
                        Duplicate
                      </button>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="text-xs text-[#4a8cff]"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-[#f3efe6]/45">
                  No products match your search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
