import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { ShopToolbar } from "@/components/shop-toolbar";
import { getCategoryNames, getProducts, searchProducts } from "@/lib/products";

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

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-24 md:px-8 md:pt-36 md:pb-32">
      <div className="animate-fade-up max-w-2xl">
        <p className="text-[11px] tracking-[0.28em] text-[#d4b483] uppercase">
          Catalog
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-none text-[#f3efe6] md:text-6xl">
          Shop
        </h1>
        <p className="mt-5 text-[15px] text-[#f3efe6]/55 md:text-base">
          Premium accessories curated for modern vehicles.
        </p>
      </div>

      <ShopToolbar
        categories={categories}
        activeCategory={category}
        query={q}
      />

      <p className="mt-10 text-xs tracking-[0.18em] text-[#f3efe6]/35 uppercase">
        {products.length} product{products.length === 1 ? "" : "s"}
      </p>

      {products.length === 0 ? (
        <p className="mt-16 text-[#f3efe6]/55">
          No products match this filter.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}

      <div className="mt-16 text-center">
        <Link
          href="/shop"
          className="text-[11px] tracking-[0.2em] text-[#f3efe6]/45 uppercase hover:text-[#d4b483]"
        >
          Clear filters
        </Link>
      </div>
    </div>
  );
}
