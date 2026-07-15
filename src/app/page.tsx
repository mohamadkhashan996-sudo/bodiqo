import Link from "next/link";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts, getProducts } from "@/lib/products";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";

export default async function HomePage() {
  const [products, featured, homepage] = await Promise.all([
    getProducts(),
    getFeaturedProducts(4),
    getSetting(SETTING_KEYS.homepage),
  ]);
  const heroProduct =
    products.find((p) => p.slug === homepage.heroImageProductSlug) ||
    products.find((p) => p.slug.includes("dash-cam")) ||
    products[0];

  return (
    <>
      <Hero
        product={heroProduct}
        headline={homepage.heroHeadline}
        subheadline={homepage.heroSubheadline}
        ctaLabel={homepage.heroCtaLabel}
        ctaHref={homepage.heroCtaHref}
      />

      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
        <div className="mb-14 flex items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-[11px] tracking-[0.28em] text-[#4a8cff] uppercase">
              Featured
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-none text-[#f3efe6] md:text-5xl">
              Essentials for the cabin
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden text-[11px] tracking-[0.22em] text-[#f3efe6]/55 uppercase transition hover:text-[#4a8cff] md:inline"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-8">
          {featured.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-gradient-to-b from-[#101010] to-[#0b0b0b]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-3 md:gap-16 md:px-8 md:py-28">
          {[
            {
              title: "Premium curation",
              body: "Every product is selected for finish, feel, and real-world performance.",
            },
            {
              title: "Secure checkout",
              body: "PayPal-protected payments with tracked delivery — from cart to doorstep.",
            },
            {
              title: "Built for modern cars",
              body: "Accessories designed to complement today’s interiors and tech.",
            },
          ].map((item) => (
            <div key={item.title} className="max-w-sm">
              <h3 className="font-[family-name:var(--font-display)] text-3xl text-[#f3efe6]">
                {item.title}
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-[#f3efe6]/55">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
        <div className="mb-14 max-w-xl">
          <p className="text-[11px] tracking-[0.28em] text-[#4a8cff] uppercase">
            Collection
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-none text-[#f3efe6] md:text-5xl">
            Shop the full range
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>
    </>
  );
}
