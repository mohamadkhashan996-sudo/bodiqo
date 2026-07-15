import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/catalog-types";

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">
            Products
          </h1>
          <p className="mt-2 text-sm text-[#f3efe6]/55">
            {products.length} products · edit inventory, prices, and visibility
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-[#d4b483] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Add product
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121212] text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                SKU
              </th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Stock
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                className="border-t border-white/5 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="flex items-center gap-3"
                  >
                    <div className="relative h-12 w-10 overflow-hidden rounded-md bg-[#1a1a1a]">
                      {p.images[0] ? (
                        <Image
                          src={p.images[0]}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[#f3efe6] hover:text-[#d4b483]">
                        {p.title}
                      </p>
                      <p className="text-xs text-[#f3efe6]/40">
                        {p.category?.name}
                      </p>
                    </div>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 text-[#f3efe6]/55 md:table-cell">
                  {p.sku}
                </td>
                <td className="px-4 py-3">{formatPrice(Number(p.price))}</td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {p.inventory}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      p.enabled ? "text-[#8fdfb0]" : "text-[#f3efe6]/35"
                    }
                  >
                    {p.enabled ? "Active" : "Disabled"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
