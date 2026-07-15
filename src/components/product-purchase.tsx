"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog-types";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { formatPrice } from "@/lib/catalog-types";
import {
  availableStock,
  stockBadgeClass,
  stockLabel,
  stockStatus,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";

type Props = {
  product: CatalogProduct;
};

export function ProductPurchase({ product }: Props) {
  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");

  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? variants[0],
    [variants, selectedId],
  );

  const price = selected?.price ?? product.price;
  const compareAt = product.compareAt;
  const onSale = Boolean(compareAt && compareAt > price);
  const image = selected?.image || product.image;

  const inventory = selected?.inventory ?? product.inventory ?? 0;
  const reserved = product.reserved ?? 0;
  const status = stockStatus(
    inventory,
    hasVariants ? 0 : reserved,
  );
  const available = availableStock(inventory, hasVariants ? 0 : reserved);
  const inStock = selected ? selected.inStock : product.inStock;

  const cartProduct: CatalogProduct & {
    variantId?: string;
    variantTitle?: string;
  } = {
    ...product,
    price,
    image,
    inStock,
    inventory,
    variantId: selected?.id,
    variantTitle: selected?.title,
  };

  return (
    <>
      {hasVariants ? (
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#121212] shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.04] lg:hidden">
          <Image
            src={image}
            alt={product.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      ) : null}

      {product.brand ? (
        <p className="mt-2 text-sm text-[#f3efe6]/50">{product.brand}</p>
      ) : null}

      <div className="mt-8 flex items-baseline gap-3">
        <span className="text-2xl tracking-tight text-[#f3efe6]">
          {formatPrice(price, product.currency)}
        </span>
        {onSale ? (
          <span className="text-lg text-[#f3efe6]/30 line-through">
            {formatPrice(compareAt!, product.currency)}
          </span>
        ) : null}
      </div>

      {hasVariants ? (
        <div className="mt-8">
          <p className="text-[11px] tracking-[0.18em] text-[#f3efe6]/45 uppercase">
            Variant
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={!v.inStock}
                onClick={() => setSelectedId(v.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[11px] tracking-[0.12em] uppercase transition",
                  selectedId === v.id
                    ? "border-[#4a8cff] bg-[#4a8cff]/15 text-[#4a8cff]"
                    : "border-white/15 text-[#f3efe6]/70 hover:border-[#4a8cff]/50",
                  !v.inStock && "cursor-not-allowed opacity-40",
                )}
              >
                {v.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-[#f3efe6]/60">
        {product.shortDescription}
      </p>

      <div className="mt-10 max-w-md space-y-3">
        <AddToCartButton product={cartProduct} variantId={selected?.id} />
      </div>

      <dl className="mt-12 space-y-4 border-t border-white/[0.08] pt-8 text-sm text-[#f3efe6]/50">
        <div className="flex gap-6">
          <dt className="w-24 tracking-[0.14em] uppercase">SKU</dt>
          <dd className="text-[#f3efe6]/85">{selected?.sku ?? product.sku}</dd>
        </div>
        <div className="flex gap-6">
          <dt className="w-24 tracking-[0.14em] uppercase">Vendor</dt>
          <dd className="text-[#f3efe6]/85">{product.vendor}</dd>
        </div>
        <div className="flex gap-6">
          <dt className="w-24 tracking-[0.14em] uppercase">Stock</dt>
          <dd className={stockBadgeClass(status)}>
            {stockLabel(status)} · {stockLabel(status, "ar")}
            {available > 0 && available <= 5 ? ` (${available})` : null}
          </dd>
        </div>
      </dl>
    </>
  );
}
