import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { formatPrice } from "@/lib/catalog-types";
import {
  getProductBySlug,
  getProducts,
  getProductsByCategory,
} from "@/lib/products";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return {
    title: product.title,
    description: product.shortDescription,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (await getProductsByCategory(product.category))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);
  const onSale = Boolean(
    product.compareAt && product.compareAt > product.price,
  );

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-24 md:px-8 md:pt-36 md:pb-32">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="space-y-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#121212] shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.04]">
            <Image
              src={product.image}
              alt={product.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          {product.images.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(0, 4).map((src) => (
                <div
                  key={src}
                  className="relative aspect-square overflow-hidden rounded-xl bg-[#121212] ring-1 ring-white/[0.04]"
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col justify-center lg:sticky lg:top-28 lg:py-8">
          <p className="text-[11px] tracking-[0.28em] text-[#d4b483] uppercase">
            {product.category}
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-[1.05] text-[#f3efe6] md:text-5xl">
            {product.title}
          </h1>

          <div className="mt-8 flex items-baseline gap-3">
            <span className="text-2xl tracking-tight text-[#f3efe6]">
              {formatPrice(product.price)}
            </span>
            {onSale ? (
              <span className="text-lg text-[#f3efe6]/30 line-through">
                {formatPrice(product.compareAt!)}
              </span>
            ) : null}
          </div>

          <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-[#f3efe6]/60">
            {product.shortDescription}
          </p>

          <div className="mt-10 max-w-md space-y-3">
            <AddToCartButton product={product} />
            <Link
              href="/cart"
              className="block rounded-full border border-white/15 px-6 py-3.5 text-center text-[11px] font-semibold tracking-[0.2em] text-[#f3efe6] uppercase transition hover:border-[#d4b483] hover:text-[#d4b483]"
            >
              View cart
            </Link>
          </div>

          <dl className="mt-12 space-y-4 border-t border-white/[0.08] pt-8 text-sm text-[#f3efe6]/50">
            <div className="flex gap-6">
              <dt className="w-24 tracking-[0.14em] uppercase">SKU</dt>
              <dd className="text-[#f3efe6]/85">{product.sku}</dd>
            </div>
            <div className="flex gap-6">
              <dt className="w-24 tracking-[0.14em] uppercase">Vendor</dt>
              <dd className="text-[#f3efe6]/85">{product.vendor}</dd>
            </div>
            <div className="flex gap-6">
              <dt className="w-24 tracking-[0.14em] uppercase">Stock</dt>
              <dd className="text-[#f3efe6]/85">
                {product.inStock ? "In stock" : "Sold out"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {product.description ? (
        <section className="mt-24 max-w-3xl border-t border-white/[0.08] pt-14">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#f3efe6]">
            Details
          </h2>
          <p className="mt-6 text-[15px] leading-8 whitespace-pre-line text-[#f3efe6]/60">
            {product.description}
          </p>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-24 border-t border-white/[0.08] pt-14">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#f3efe6]">
            You may also like
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-8">
            {related.map((p, index) => (
              <ProductCard key={p.id} product={p} index={index} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
