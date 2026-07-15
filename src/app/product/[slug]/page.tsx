import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import {
  formatPrice,
  getProductBySlug,
  getProducts,
  getProductsByCategory,
} from "@/lib/catalog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return {
    title: product.title,
    description: product.shortDescription,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = getProductsByCategory(product.category)
    .filter((p) => p.id !== product.id)
    .slice(0, 4);
  const onSale = Boolean(
    product.compareAt && product.compareAt > product.price,
  );

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-20 md:px-8 md:pt-32 md:pb-28">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#141414]">
          <Image
            src={product.image}
            alt={product.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-[11px] tracking-[0.24em] text-[#d4b483] uppercase">
            {product.category}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[#f3efe6] md:text-5xl">
            {product.title}
          </h1>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-2xl text-[#f3efe6]">
              {formatPrice(product.price)}
            </span>
            {onSale ? (
              <span className="text-lg text-[#f3efe6]/35 line-through">
                {formatPrice(product.compareAt!)}
              </span>
            ) : null}
          </div>

          <p className="mt-6 max-w-lg text-sm leading-relaxed text-[#f3efe6]/65 md:text-base">
            {product.shortDescription}
          </p>

          <div className="mt-8 max-w-sm space-y-3">
            <AddToCartButton product={product} />
            <Link
              href="/cart"
              className="block border border-white/20 px-6 py-3.5 text-center text-[11px] font-semibold tracking-[0.2em] text-[#f3efe6] uppercase transition hover:border-[#d4b483] hover:text-[#d4b483]"
            >
              View cart
            </Link>
          </div>

          <dl className="mt-10 space-y-3 border-t border-white/10 pt-8 text-sm text-[#f3efe6]/55">
            <div className="flex gap-4">
              <dt className="w-24 tracking-[0.12em] uppercase">SKU</dt>
              <dd className="text-[#f3efe6]/85">{product.sku}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-24 tracking-[0.12em] uppercase">Vendor</dt>
              <dd className="text-[#f3efe6]/85">{product.vendor}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-24 tracking-[0.12em] uppercase">Stock</dt>
              <dd className="text-[#f3efe6]/85">
                {product.inStock ? "In stock" : "Sold out"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {product.description ? (
        <section className="mt-20 max-w-3xl border-t border-white/10 pt-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#f3efe6]">
            Details
          </h2>
          <p className="mt-5 text-sm leading-7 whitespace-pre-line text-[#f3efe6]/65">
            {product.description}
          </p>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-20 border-t border-white/10 pt-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#f3efe6]">
            You may also like
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {related.map((p, index) => (
              <ProductCard key={p.id} product={p} index={index} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
