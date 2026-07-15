import { prisma } from "@/lib/prisma";
import catalog from "@/data/catalog.json";
import type { CatalogProduct } from "@/lib/catalog-types";

export type { CatalogProduct } from "@/lib/catalog-types";
export { CATEGORIES, formatPrice, slugifyCategory } from "@/lib/catalog-types";

function fromJson(): CatalogProduct[] {
  return catalog.products as CatalogProduct[];
}

function mapDbProduct(p: {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  price: { toNumber?: () => number } | number | string;
  compareAt: { toNumber?: () => number } | number | string | null;
  currency: string;
  images: string[];
  featured: boolean;
  inStock: boolean;
  enabled?: boolean;
  sku: string;
  vendor: string;
  category: { name: string } | null;
}): CatalogProduct {
  const price =
    typeof p.price === "object" && p.price && "toNumber" in p.price
      ? p.price.toNumber!()
      : Number(p.price);
  const compareAt = p.compareAt
    ? typeof p.compareAt === "object" && "toNumber" in p.compareAt
      ? p.compareAt.toNumber!()
      : Number(p.compareAt)
    : null;

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    originalTitle: p.title,
    description: p.description,
    shortDescription: p.shortDescription,
    price,
    compareAt: compareAt && compareAt > price ? compareAt : null,
    currency: p.currency,
    category: p.category?.name ?? "Accessories",
    images: p.images,
    image: p.images[0] ?? "",
    featured: p.featured,
    inStock: p.inStock,
    sku: p.sku,
    vendor: p.vendor,
  };
}

export async function getProducts(): Promise<CatalogProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { enabled: true },
      include: { category: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
    if (rows.length > 0) return rows.map(mapDbProduct);
  } catch {
    // DB unavailable — fall back to static catalog
  }
  return fromJson();
}

export async function getFeaturedProducts(limit = 4) {
  const products = await getProducts();
  const featured = products.filter((p) => p.featured);
  return (featured.length ? featured : products).slice(0, limit);
}

export async function getProductBySlug(slug: string) {
  try {
    const row = await prisma.product.findFirst({
      where: { slug, enabled: true },
      include: { category: true },
    });
    if (row) return mapDbProduct(row);
  } catch {
    // fall through
  }
  return fromJson().find((p) => p.slug === slug);
}

export async function getProductsByCategory(category: string) {
  const products = await getProducts();
  return products.filter(
    (p) => p.category.toLowerCase() === category.toLowerCase(),
  );
}

export async function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  const products = await getProducts();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q),
  );
}

export async function getCategoryNames() {
  try {
    const cats = await prisma.category.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    });
    if (cats.length) return cats.map((c) => c.name);
  } catch {
    // fall through
  }
  return [...new Set(fromJson().map((p) => p.category))];
}
