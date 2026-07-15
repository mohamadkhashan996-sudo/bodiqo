"use client";

import Image from "next/image";
import Link from "next/link";
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
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "hidden" | "oos">(
    "all",
  );

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">
            Products
          </h1>
          <p className="mt-2 text-sm text-[#f3efe6]/55">
            إضافة · تعديل · حذف · صور · فيديو · مخزون — مثل Shopify
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-[#d4b483] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          + Add product
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products, SKU, category…"
          className="min-w-[240px] flex-1 rounded-full border border-white/10 bg-[#121212] px-5 py-3 text-sm outline-none focus:border-[#d4b483]"
        />
        {(
          [
            ["all", "All"],
            ["active", "Published"],
            ["hidden", "Hidden"],
            ["oos", "Out of stock"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? "rounded-full bg-[#d4b483] px-4 py-2 text-[10px] tracking-[0.14em] text-[#0b0b0b] uppercase"
                : "rounded-full border border-white/15 px-4 py-2 text-[10px] tracking-[0.14em] text-[#f3efe6]/60 uppercase"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121212] text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
            <tr>
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
                        <p className="text-[#f3efe6] hover:text-[#d4b483]">
                          {p.featured ? "⭐ " : ""}
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
                    <span className="mt-0.5 block text-[10px] text-[#f3efe6]/35">
                      {stockLabel(status, "ar")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.enabled ? "text-[#8fdfb0]" : "text-[#f3efe6]/35"
                      }
                    >
                      {p.enabled ? "Published" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-xs text-[#d4b483]"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-[#f3efe6]/45">
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
