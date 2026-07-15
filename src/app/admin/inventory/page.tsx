import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  availableStock,
  stockBadgeClass,
  stockLabel,
  stockStatus,
} from "@/lib/inventory";

export default async function InventoryPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    orderBy: { inventory: "asc" },
  });

  const totals = products.reduce(
    (acc, p) => {
      acc.available += availableStock(p.inventory, p.reserved);
      acc.sold += p.soldCount;
      acc.reserved += p.reserved;
      return acc;
    },
    { available: 0, sold: 0, reserved: 0 },
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Inventory
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Available · Sold · Reserved · حالة المخزون
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Available", ar: "متوفر", value: totals.available },
          { label: "Sold", ar: "مباع", value: totals.sold },
          { label: "Reserved", ar: "محجوز", value: totals.reserved },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-[#121212] p-5"
          >
            <p className="text-[10px] tracking-[0.2em] text-[#f3efe6]/40 uppercase">
              {c.label}
            </p>
            <p className="mt-1 text-xs text-[#f3efe6]/35">{c.ar}</p>
            <p className="mt-3 text-3xl text-[#f3efe6]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121212] text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Sold</th>
              <th className="px-4 py-3">Reserved</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const status = stockStatus(p.inventory, p.reserved);
              const available = availableStock(p.inventory, p.reserved);
              return (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="hover:text-[#d4b483]"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{available}</td>
                  <td className="px-4 py-3">{p.soldCount}</td>
                  <td className="px-4 py-3">{p.reserved}</td>
                  <td className={`px-4 py-3 ${stockBadgeClass(status)}`}>
                    <span>{stockLabel(status)}</span>
                    <span className="mt-0.5 block text-[10px] opacity-70">
                      {stockLabel(status, "ar")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
