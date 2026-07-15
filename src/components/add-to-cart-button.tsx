"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { stockStatus } from "@/lib/inventory";

type Props = {
  product: CatalogProduct;
  quantity?: number;
  variant?: "primary" | "ghost";
  className?: string;
};

export function AddToCartButton({
  product,
  quantity = 1,
  variant = "primary",
  className,
}: Props) {
  const addItem = useCart((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const status = stockStatus(
    product.inventory ?? (product.inStock ? 1 : 0),
    product.reserved ?? 0,
  );
  const outOfStock = status === "OUT_OF_STOCK" || !product.inStock;

  if (outOfStock) {
    return (
      <div
        className={cn(
          "w-full rounded-full border border-white/10 px-6 py-3.5 text-center text-[11px] font-semibold tracking-[0.2em] text-[#f3efe6]/35 uppercase",
          className,
        )}
      >
        Out of stock · نفد من المخزن
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        addItem(product, quantity);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1400);
      }}
      className={cn(
        "w-full rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase transition",
        variant === "primary"
          ? "bg-[#d4b483] px-6 py-3.5 text-[#0b0b0b] shadow-[0_10px_30px_rgba(212,180,131,0.2)] hover:bg-[#e2c69a]"
          : "border border-white/15 px-4 py-2.5 text-[#f3efe6]/80 hover:border-[#d4b483] hover:text-[#d4b483]",
        className,
      )}
    >
      {added ? "Added" : "Add to cart"}
    </button>
  );
}
