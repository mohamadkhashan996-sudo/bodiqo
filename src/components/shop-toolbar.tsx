"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ShopToolbar({
  categories,
  activeCategory,
  query,
}: {
  categories: string[];
  activeCategory?: string;
  query?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(query || "");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (activeCategory) params.set("category", activeCategory);
    router.push(`/shop?${params.toString()}`);
  }

  return (
    <div className="mt-12 space-y-6">
      <form onSubmit={onSearch} className="flex gap-3">
        <label className="sr-only" htmlFor="shop-search">
          Search products
        </label>
        <input
          id="shop-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-[#f3efe6] transition outline-none placeholder:text-[#f3efe6]/30 focus:border-[#d4b483]/50"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[#d4b483] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/shop" label="All" active={!activeCategory} />
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
          ? "rounded-full bg-[#d4b483] px-4 py-2 text-[10px] tracking-[0.14em] text-[#0b0b0b] uppercase shadow-[0_8px_24px_rgba(212,180,131,0.2)]"
          : "rounded-full border border-white/12 px-4 py-2 text-[10px] tracking-[0.14em] text-[#f3efe6]/65 uppercase transition hover:border-[#d4b483] hover:text-[#d4b483]"
      }
    >
      {label}
    </Link>
  );
}
