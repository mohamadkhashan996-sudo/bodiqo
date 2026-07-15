"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CatalogProduct } from "@/lib/catalog-types";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Price } from "@/components/price";

type ProductCardProps = {
  product: CatalogProduct;
  index?: number;
};

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const onSale = Boolean(
    product.compareAt && product.compareAt > product.price,
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.65,
        delay: Math.min(index * 0.05, 0.28),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#121212] shadow-[0_20px_60px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04]">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.05]"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
          {onSale ? (
            <span className="absolute top-3 left-3 rounded-full bg-[#4a8cff] px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase">
              Sale
            </span>
          ) : null}
        </div>
        <div className="mt-5 space-y-2 px-0.5">
          <p className="text-[10px] tracking-[0.22em] text-[#4a8cff]/90 uppercase">
            {product.category}
          </p>
          <h3 className="text-[15px] leading-snug text-[#f3efe6] transition group-hover:text-[#4a8cff] md:text-base">
            {product.title}
          </h3>
          <div className="flex items-baseline gap-2.5 pt-1">
            <Price amount={product.price} className="text-sm text-[#f3efe6]" />
            {onSale ? (
              <Price
                amount={product.compareAt!}
                className="text-sm text-[#f3efe6]/30 line-through"
              />
            ) : null}
          </div>
        </div>
      </Link>
      <div className="mt-4">
        <AddToCartButton product={product} variant="ghost" />
      </div>
    </motion.article>
  );
}
