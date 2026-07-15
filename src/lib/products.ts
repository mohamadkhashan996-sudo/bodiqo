import { prisma } from "@/lib/prisma";
import type { CatalogProduct } from "@/lib/catalog-types";
import { ProductStatus } from "@prisma/client";

export type { CatalogProduct } from "@/lib/catalog-types";
export { CATEGORIES, formatPrice, slugifyCategory } from "@/lib/catalog-types";

const PUBLIC_PRODUCT_WHERE = {
  enabled: true,
  status: ProductStatus.PUBLISHED,
} as const;

function asImageList(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((v): v is string => typeof v === "string");
  }
  return [];
}

function decimalToNumber(
  value: { toNumber?: () => number } | number | string | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "object" && "toNumber" in value) {
    return value.toNumber!();
  }
  return Number(value);
}

type DbVariant = {
  id: string;
  title: string;
  sku: string;
  price: { toNumber?: () => number } | number | string;
  inventory: number;
  inStock: boolean;
  enabled: boolean;
  image: string | null;
  sortOrder: number;
};

function mapVariant(v: DbVariant) {
  const price = decimalToNumber(v.price) ?? 0;
  return {
    id: v.id,
    title: v.title,
    sku: v.sku,
    price,
    inventory: v.inventory,
    inStock: v.inStock && v.enabled && v.inventory > 0,
    image: v.image,
  };
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
  images: unknown;
  featured: boolean;
  inStock: boolean;
  inventory?: number;
  reserved?: number;
  soldCount?: number;
  enabled?: boolean;
  status?: ProductStatus;
  sku: string;
  vendor: string;
  brand?: string | null;
  variants?: DbVariant[];
  category: { name: string } | null;
  reviews?: { rating: number }[];
}): CatalogProduct {
  const price = decimalToNumber(p.price) ?? 0;
  const compareAtRaw = decimalToNumber(p.compareAt);
  const compareAt =
    compareAtRaw && compareAtRaw > price ? compareAtRaw : null;
  const images = asImageList(p.images);

  const enabledVariants = (p.variants ?? [])
    .filter((v) => v.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(mapVariant);

  const hasVariants = enabledVariants.length > 0;
  const defaultVariant = enabledVariants[0];
  const effectivePrice = hasVariants ? defaultVariant.price : price;
  const effectiveInStock = hasVariants
    ? enabledVariants.some((v) => v.inStock)
    : p.inStock &&
      (p.inventory == null || p.inventory - (p.reserved ?? 0) > 0);

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    originalTitle: p.title,
    description: p.description,
    shortDescription: p.shortDescription,
    price: effectivePrice,
    compareAt,
    currency: p.currency,
    category: p.category?.name ?? "Accessories",
    brand: p.brand ?? null,
    images,
    image: defaultVariant?.image || images[0] || "",
    featured: p.featured,
    inStock: effectiveInStock,
    inventory: hasVariants
      ? enabledVariants.reduce((sum, v) => sum + v.inventory, 0)
      : p.inventory,
    reserved: p.reserved,
    soldCount: p.soldCount ?? 0,
    averageRating:
      p.reviews && p.reviews.length
        ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        : 0,
    sku: p.sku,
    vendor: p.vendor,
    variants: hasVariants ? enabledVariants : undefined,
  };
}

const productInclude = {
  category: true,
  variants: {
    where: { enabled: true },
    orderBy: { sortOrder: "asc" as const },
  },
  reviews: {
    where: { approved: true },
    select: { rating: true },
  },
};

export async function getProducts(): Promise<CatalogProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: PUBLIC_PRODUCT_WHERE,
      include: productInclude,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(mapDbProduct);
  } catch {
    // Never ship demo catalog.json to customers — empty when DB is down
    return [];
  }
}

export async function getFeaturedProducts(limit = 4) {
  const products = await getProducts();
  const featured = products.filter((p) => p.featured);
  return (featured.length ? featured : products).slice(0, limit);
}

export async function getProductBySlug(slug: string) {
  try {
    const row = await prisma.product.findFirst({
      where: { slug, ...PUBLIC_PRODUCT_WHERE },
      include: productInclude,
    });
    if (row) return mapDbProduct(row);
  } catch {
    // ignore
  }
  return undefined;
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
      p.sku.toLowerCase().includes(q) ||
      (p.brand?.toLowerCase().includes(q) ?? false),
  );
}

export async function getCategoryNames() {
  try {
    const cats = await prisma.category.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    });
    return cats.map((c) => c.name);
  } catch {
    return [];
  }
}
