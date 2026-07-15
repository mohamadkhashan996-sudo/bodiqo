import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function SellersPage() {
  await requireAdmin();
  const sellers = await prisma.seller.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Sellers
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Future multi-vendor hook. v1 is single-merchant — sellers stay disabled
          until you expand payouts and vendor dashboards.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121212] text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((s) => (
              <tr key={s.id} className="border-t border-white/5">
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3 text-[#f3efe6]/55">{s.slug}</td>
                <td className="px-4 py-3">{s._count.products}</td>
                <td className="px-4 py-3">
                  {s.enabled ? "Enabled" : "Disabled"}
                </td>
              </tr>
            ))}
            {sellers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-[#f3efe6]/45">
                  No sellers yet. Schema is ready for Phase 5 marketplace expansion.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
