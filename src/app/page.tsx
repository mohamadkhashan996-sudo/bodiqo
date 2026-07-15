import Link from "next/link";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts, getProducts } from "@/lib/catalog";

export default function HomePage() {
  const products = getProducts();
  const featured = getFeaturedProducts(4);
  const heroProduct =
    products.find((p) => p.slug.includes("dash-cam")) ?? products[0];

  return (
    <>
      <Hero product={heroProduct} />

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="mb-12 flex items-end justify-between gap-6">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-[#d4b483] uppercase">
              Featured
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[#f3efe6] md:text-5xl">
              Essentials for the cabin
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden text-[11px] tracking-[0.2em] text-[#f3efe6]/70 uppercase transition hover:text-[#d4b483] md:inline"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {featured.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#101010]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-3 md:px-8 md:py-20">
          {[
            {
              title: "Premium curation",
              body: "Every product is selected for finish, feel, and real-world performance.",
            },
            {
              title: "Secure checkout",
              body: "Encrypted payments and tracked delivery — from cart to doorstep.",
            },
            {
              title: "Built for modern cars",
              body: "Accessories designed to complement today’s interiors and tech.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-[family-name:var(--font-display)] text-2xl text-[#f3efe6]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#f3efe6]/60">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="mb-12">
          <p className="text-[11px] tracking-[0.24em] text-[#d4b483] uppercase">
            Collection
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[#f3efe6] md:text-5xl">
            Shop the full range
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>
    </>
  );
}
