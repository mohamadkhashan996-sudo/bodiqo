"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

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
