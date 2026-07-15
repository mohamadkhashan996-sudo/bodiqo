export const CATEGORIES = [
  "Electronics",
  "Home",
  "Kitchen",
  "Pets",
  "Gaming",
  "Beauty",
  "Fashion",
  "Shoes",
  "Jewelry",
  "Sports",
  "Outdoor",
  "Furniture",
  "Phones",
  "Accessories",
  "Tools",
  "Baby",
  "Health",
  "Office",
  "Automotive",
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
  brand?: string | null;
  images: string[];
  image: string;
  featured: boolean;
  inStock: boolean;
  inventory?: number;
  reserved?: number;
  soldCount?: number;
  averageRating?: number;
  sku: string;
  vendor: string;
  variantId?: string;
  variants?: Array<{
    id: string;
    title: string;
    sku: string;
    price: number;
    inventory: number;
    inStock: boolean;
    image?: string | null;
  }>;
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
