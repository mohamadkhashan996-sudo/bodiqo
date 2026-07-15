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
  inventory?: number;
  reserved?: number;
  sku: string;
  vendor: string;
};

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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
