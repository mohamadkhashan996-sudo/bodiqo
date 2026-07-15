"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatPrice, type CatalogProduct } from "@/lib/catalog";
import { AddToCartButton } from "@/components/add-to-cart-button";

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
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.55,
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#141414]">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {onSale ? (
            <span className="absolute top-3 left-3 bg-[#d4b483] px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase">
              Sale
            </span>
          ) : null}
        </div>
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] tracking-[0.2em] text-[#d4b483]/90 uppercase">
            {product.category}
          </p>
          <h3 className="text-base leading-snug text-[#f3efe6] transition group-hover:text-[#d4b483]">
            {product.title}
          </h3>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-sm text-[#f3efe6]">
              {formatPrice(product.price)}
            </span>
            {onSale ? (
              <span className="text-sm text-[#f3efe6]/35 line-through">
                {formatPrice(product.compareAt!)}
              </span>
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
