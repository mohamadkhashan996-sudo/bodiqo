import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ProductsManager } from "@/components/admin/products-manager";

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <ProductsManager
      products={products.map((p) => ({
        id: p.id,
        title: p.title,
        sku: p.sku,
        price: Number(p.price),
        inventory: p.inventory,
        reserved: p.reserved,
        soldCount: p.soldCount,
        enabled: p.enabled,
        featured: p.featured,
        inStock: p.inStock,
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
        categoryName: p.category?.name ?? null,
      }))}
    />
  );
}
