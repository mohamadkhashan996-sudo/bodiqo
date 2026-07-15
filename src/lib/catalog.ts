/** @deprecated Prefer @/lib/products for async DB-backed catalog */
export type { CatalogProduct } from "@/lib/catalog-types";
export {
  CATEGORIES,
  formatPrice,
  slugify,
  slugifyCategory,
} from "@/lib/catalog-types";

import catalog from "@/data/catalog.json";
import type { CatalogProduct } from "@/lib/catalog-types";

export function getProductsSync(): CatalogProduct[] {
  return catalog.products as CatalogProduct[];
}

export function getProductBySlugSync(slug: string) {
  return getProductsSync().find((p) => p.slug === slug);
}
