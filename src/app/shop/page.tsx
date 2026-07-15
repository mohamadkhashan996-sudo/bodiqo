import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES, getProducts, searchProducts } from "@/lib/catalog";

type Props = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export const metadata = {
  title: "Shop",
};

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category?.trim();
  const q = params.q?.trim();

  let products = q ? searchProducts(q) : getProducts();
  if (category) {
    products = products.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase(),
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-20 md:px-8 md:pt-32 md:pb-28">
      <div className="max-w-2xl">
        <p className="text-[11px] tracking-[0.24em] text-[#d4b483] uppercase">
          Catalog
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6] md:text-6xl">
          Shop
        </h1>
        <p className="mt-4 text-sm text-[#f3efe6]/60 md:text-base">
          Premium accessories imported from the BODIQO store catalog.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        <FilterChip href="/shop" label="All" active={!category} />
        {CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            href={`/shop?category=${encodeURIComponent(cat)}`}
            label={cat}
            active={category?.toLowerCase() === cat.toLowerCase()}
          />
        ))}
      </div>

      <p className="mt-8 text-xs tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {products.length} product{products.length === 1 ? "" : "s"}
      </p>

      {products.length === 0 ? (
        <p className="mt-16 text-[#f3efe6]/60">
          No products match this filter.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
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
          ? "bg-[#d4b483] px-3.5 py-2 text-[10px] tracking-[0.14em] text-[#0b0b0b] uppercase"
          : "border border-white/15 px-3.5 py-2 text-[10px] tracking-[0.14em] text-[#f3efe6]/70 uppercase transition hover:border-[#d4b483] hover:text-[#d4b483]"
      }
    >
      {label}
    </Link>
  );
}
