import catalog from "@/data/catalog.json";

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  originalTitle: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAt: number | null;
  currency: string;
  category: string;
  images: string[];
  image: string;
  featured: boolean;
  inStock: boolean;
  sku: string;
  vendor: string;
};

export const CATEGORIES = [
  "Car Phone Holders",
  "Dash Cameras",
  "Car Chargers",
  "Air Compressors",
  "Air Fresheners",
  "Interior Accessories",
  "Exterior Accessories",
  "Emergency Tools",
  "Car Cleaning Products",
] as const;

export function getProducts(): CatalogProduct[] {
  return catalog.products as CatalogProduct[];
}

export function getFeaturedProducts(limit = 4): CatalogProduct[] {
  const featured = getProducts().filter((p) => p.featured);
  return (featured.length ? featured : getProducts()).slice(0, limit);
}

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return getProducts().find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string): CatalogProduct[] {
  return getProducts().filter(
    (p) => p.category.toLowerCase() === category.toLowerCase(),
  );
}

export function searchProducts(query: string): CatalogProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return getProducts();
  return getProducts().filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q),
  );
}

export function formatPrice(amount: number, currency = "ILS"): string {
  return new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
