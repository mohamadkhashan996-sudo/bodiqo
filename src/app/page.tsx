import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card";
import { Newsletter } from "@/components/home/newsletter";
import { SectionHeading } from "@/components/home/section-heading";
import {
  getApprovedReviews,
  getBestSellingProducts,
  getFeaturedCategories,
  getFlashDeals,
  getNewArrivals,
  getProducts,
} from "@/lib/products";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";

export default async function HomePage() {
  const [
    products,
    bestsellers,
    newArrivals,
    flashDeals,
    categories,
    reviews,
    homepage,
  ] = await Promise.all([
    getProducts(),
    getBestSellingProducts(8),
    getNewArrivals(8),
    getFlashDeals(8),
    getFeaturedCategories(8),
    getApprovedReviews(6),
    getSetting(SETTING_KEYS.homepage),
  ]);

  const heroProduct =
    products.find((p) => p.slug === homepage.heroImageProductSlug) ||
    products[0];

  const fallbackReviews = [
    {
      id: "f1",
      author: "Amelia R.",
      rating: 5,
      title: "Exceptional curation",
      body: "Everything arrived beautifully packaged. The site feels like a real international boutique.",
      product: null as { title: string; slug: string } | null,
    },
    {
      id: "f2",
      author: "Jonas K.",
      rating: 5,
      title: "Fast and premium",
      body: "Checkout was seamless across currencies. Will shop again for gifting.",
      product: null,
    },
    {
      id: "f3",
      author: "Sara M.",
      rating: 4,
      title: "Love the selections",
      body: "Flash deals were genuine and the product quality matched the photos.",
      product: null,
    },
  ];

  const reviewList = reviews.length ? reviews : fallbackReviews;

  return (
    <>
      <Hero
        product={heroProduct}
        headline={homepage.heroHeadline || "A global marketplace, refined"}
        subheadline={
          homepage.heroSubheadline ||
          "Discover bestsellers, new arrivals, and curated essentials from BODIQO."
        }
        ctaLabel={homepage.heroCtaLabel || "Shop now"}
        ctaHref={homepage.heroCtaHref || "/shop"}
      />

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <SectionHeading
          eyebrow="Categories"
          title="Shop by category"
          href="/categories"
          linkLabel="All categories"
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {(categories.length
            ? categories
            : [
                "Electronics",
                "Home",
                "Fashion",
                "Beauty",
                "Sports",
                "Lifestyle",
                "Gadgets",
                "Essentials",
              ].map((name, i) => ({
                id: String(i),
                name,
                slug: name.toLowerCase(),
                productCount: 0,
                image: null as string | null,
              }))
          ).map((cat, index) => (
            <Link
              key={cat.id}
              href={`/shop?category=${encodeURIComponent(cat.name)}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--border)]"
              style={{ transitionDelay: `${Math.min(index * 40, 200)}ms` }}
            >
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(145deg,var(--surface-2),color-mix(in_srgb,var(--accent)_25%,var(--surface)))]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--foreground)] md:text-3xl">
                  {cat.name}
                </p>
                {cat.productCount ? (
                  <p className="mt-1 text-xs tracking-[0.16em] text-[var(--foreground)]/55 uppercase">
                    {cat.productCount} items
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <SectionHeading
          eyebrow="Bestsellers"
          title="Best-selling products"
          href="/shop?sort=bestselling"
          linkLabel="View all"
        />
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-8">
          {(bestsellers.length ? bestsellers : products)
            .slice(0, 8)
            .map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
        </div>
        {!products.length ? (
          <p className="mt-10 text-sm text-[var(--foreground)]/55">
            Products will appear here once the catalog is published.
          </p>
        ) : null}
      </section>

      <section className="border-y border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Just in"
            title="New arrivals"
            href="/shop?sort=newest"
            linkLabel="View all"
          />
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-8">
            {(newArrivals.length ? newArrivals : products)
              .slice(0, 8)
              .map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <SectionHeading
          eyebrow="Limited time"
          title="Flash deals"
          href="/shop"
          linkLabel="Shop deals"
        />
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-8">
          {(flashDeals.length ? flashDeals : products)
            .slice(0, 8)
            .map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading eyebrow="Social proof" title="Customer reviews" />
          <div className="grid gap-6 md:grid-cols-3">
            {reviewList.map((review) => (
              <blockquote
                key={review.id}
                className="rounded-2xl bg-[var(--surface)] p-6 ring-1 ring-[var(--border)]"
              >
                <div className="flex gap-1 text-[var(--accent)]" aria-label={`${review.rating} of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                  ))}
                </div>
                {review.title ? (
                  <p className="mt-4 font-[family-name:var(--font-display)] text-2xl text-[var(--foreground)]">
                    {review.title}
                  </p>
                ) : null}
                <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]/65">
                  {review.body}
                </p>
                <footer className="mt-5 text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                  {review.author}
                  {review.product ? ` · ${review.product.title}` : null}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <Newsletter />
    </>
  );
}
