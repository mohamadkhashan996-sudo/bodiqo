import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { ShopToolbar } from "@/components/shop-toolbar";
import { getCategoryNames, getProducts, searchProducts } from "@/lib/products";

type Props = {
  searchParams: Promise<{
    category?: string;
    q?: string;
    sort?: string;
    brand?: string;
    min?: string;
    max?: string;
    page?: string;
  }>;
};

export const metadata = {
  title: "Shop",
  description: "Browse the BODIQO marketplace — electronics, home, fashion, and more.",
};

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category?.trim();
  const q = params.q?.trim();
  const sort = params.sort?.trim() || "newest";
  const brand = params.brand?.trim();
  const min = params.min ? Number(params.min) : undefined;
  const max = params.max ? Number(params.max) : undefined;
  const page = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 24;

  const [categories, searched] = await Promise.all([
    getCategoryNames(),
    q ? searchProducts(q) : getProducts(),
  ]);

  let products = searched;
  if (category) {
    products = products.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase(),
    );
  }
  if (brand) {
    products = products.filter(
      (p) => (p.brand || p.vendor || "").toLowerCase() === brand.toLowerCase(),
    );
  }
  if (min != null && !Number.isNaN(min)) {
    products = products.filter((p) => p.price >= min);
  }
  if (max != null && !Number.isNaN(max)) {
    products = products.filter((p) => p.price <= max);
  }

  products = [...products].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "bestselling")
      return (b.soldCount ?? 0) - (a.soldCount ?? 0);
    if (sort === "rating")
      return (b.averageRating ?? 0) - (a.averageRating ?? 0);
    return 0; // newest already from query order; preserve
  });

  const brands = [
    ...new Set(
      searched
        .map((p) => p.brand || p.vendor)
        .filter((b): b is string => Boolean(b)),
    ),
  ].sort();

  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paged = products.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-24 md:px-8 md:pt-36 md:pb-32">
      <div className="animate-fade-up max-w-2xl">
        <p className="text-[11px] tracking-[0.28em] text-[#4a8cff] uppercase">
          Catalog
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-none text-[#f3efe6] md:text-6xl">
          Shop
        </h1>
        <p className="mt-5 text-[15px] text-[#f3efe6]/55 md:text-base">
          Premium products across every category — curated for modern living.
        </p>
      </div>

      <ShopToolbar
        categories={categories}
        brands={brands}
        activeCategory={category}
        query={q}
        sort={sort}
        brand={brand}
        minPrice={params.min}
        maxPrice={params.max}
      />

      <p className="mt-10 text-xs tracking-[0.18em] text-[#f3efe6]/35 uppercase">
        {total} product{total === 1 ? "" : "s"}
        {totalPages > 1 ? ` · page ${pageSafe}/${totalPages}` : ""}
      </p>

      {paged.length === 0 ? (
        <p className="mt-16 text-[#f3efe6]/55">
          No products match this filter.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
          {paged.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-12 flex justify-center gap-3">
          {pageSafe > 1 ? (
            <Link
              href={`/shop?${new URLSearchParams({
                ...(category ? { category } : {}),
                ...(q ? { q } : {}),
                sort,
                ...(brand ? { brand } : {}),
                page: String(pageSafe - 1),
              }).toString()}`}
              className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase"
            >
              Previous
            </Link>
          ) : null}
          {pageSafe < totalPages ? (
            <Link
              href={`/shop?${new URLSearchParams({
                ...(category ? { category } : {}),
                ...(q ? { q } : {}),
                sort,
                ...(brand ? { brand } : {}),
                page: String(pageSafe + 1),
              }).toString()}`}
              className="rounded-full bg-[#4a8cff] px-5 py-2 text-xs text-[#0b0b0b] uppercase"
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-16 text-center">
        <Link
          href="/shop"
          className="text-[11px] tracking-[0.2em] text-[#f3efe6]/45 uppercase hover:text-[#4a8cff]"
        >
          Clear filters
        </Link>
      </div>
    </div>
  );
}
