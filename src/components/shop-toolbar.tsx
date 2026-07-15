"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ShopToolbar({
  categories,
  brands,
  activeCategory,
  query,
  sort,
  minPrice,
  maxPrice,
  brand,
}: {
  categories: string[];
  brands: string[];
  activeCategory?: string;
  query?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  brand?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(query || "");
  const [min, setMin] = useState(minPrice || "");
  const [max, setMax] = useState(maxPrice || "");
  const [sortBy, setSortBy] = useState(sort || "newest");
  const [brandVal, setBrandVal] = useState(brand || "");

  function pushParams(extra: Record<string, string | undefined> = {}) {
    const params = new URLSearchParams();
    const nextQ = extra.q ?? q;
    const nextCat = extra.category ?? activeCategory;
    const nextSort = extra.sort ?? sortBy;
    const nextBrand = extra.brand ?? brandVal;
    const nextMin = extra.min ?? min;
    const nextMax = extra.max ?? max;
    if (nextQ?.trim()) params.set("q", nextQ.trim());
    if (nextCat) params.set("category", nextCat);
    if (nextSort) params.set("sort", nextSort);
    if (nextBrand) params.set("brand", nextBrand);
    if (nextMin) params.set("min", nextMin);
    if (nextMax) params.set("max", nextMax);
    router.push(`/shop?${params.toString()}`);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    pushParams();
  }

  return (
    <div className="mt-12 space-y-6">
      <form onSubmit={onSearch} className="flex flex-wrap gap-3">
        <input
          id="shop-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="min-w-[200px] flex-1 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-[#f3efe6] outline-none placeholder:text-[#f3efe6]/30 focus:border-[#4a8cff]/50"
        />
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            pushParams({ sort: e.target.value });
          }}
          className="rounded-full border border-white/10 bg-[#121212] px-4 py-3 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="bestselling">Best selling</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="rating">Highest rated</option>
        </select>
        <select
          value={brandVal}
          onChange={(e) => {
            setBrandVal(e.target.value);
            pushParams({ brand: e.target.value || undefined });
          }}
          className="rounded-full border border-white/10 bg-[#121212] px-4 py-3 text-sm"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder="Min ₪"
          type="number"
          className="w-24 rounded-full border border-white/10 bg-[#121212] px-4 py-3 text-sm"
        />
        <input
          value={max}
          onChange={(e) => setMax(e.target.value)}
          placeholder="Max ₪"
          type="number"
          className="w-24 rounded-full border border-white/10 bg-[#121212] px-4 py-3 text-sm"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Apply
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          href="/shop"
          label="All"
          active={!activeCategory}
        />
        {categories.map((cat) => (
          <FilterChip
            key={cat}
            href={`/shop?category=${encodeURIComponent(cat)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            label={cat}
            active={activeCategory?.toLowerCase() === cat.toLowerCase()}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-[#4a8cff] px-4 py-2 text-[10px] tracking-[0.14em] text-[#0b0b0b] uppercase"
          : "rounded-full border border-white/12 px-4 py-2 text-[10px] tracking-[0.14em] text-[#f3efe6]/65 uppercase transition hover:border-[#4a8cff] hover:text-[#4a8cff]"
      }
    >
      {label}
    </Link>
  );
}
