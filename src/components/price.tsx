"use client";

import { usePreferencesOptional } from "@/components/preferences-provider";
import { formatPrice as formatCatalogPrice } from "@/lib/catalog-types";

/** Displays catalog amounts in the shopper's selected currency. */
export function Price({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  const prefs = usePreferencesOptional();
  const text = prefs?.ready
    ? prefs.formatPrice(amount)
    : formatCatalogPrice(amount);
  return <span className={className}>{text}</span>;
}
