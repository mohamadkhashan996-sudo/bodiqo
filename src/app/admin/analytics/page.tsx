import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/catalog-types";

export default async function AnalyticsPage() {
  await requireAdmin();

  const [products, orders, customers, paid] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.order.findMany({
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      select: { total: true, createdAt: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const revenue = paid.reduce((sum, o) => sum + Number(o.total), 0);
  const avgOrder = paid.length ? revenue / paid.length : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Analytics
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          نظرة عامة على المبيعات والمتجر
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue", value: formatPrice(revenue) },
          { label: "Orders paid", value: String(paid.length) },
          { label: "Avg order", value: formatPrice(avgOrder) },
          { label: "Products", value: String(products) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-[#121212] p-5"
          >
            <p className="text-[10px] tracking-[0.2em] text-[#f3efe6]/40 uppercase">
              {card.label}
            </p>
            <p className="mt-3 text-2xl text-[#f3efe6]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#121212] p-5">
          <p className="text-[10px] tracking-[0.2em] text-[#f3efe6]/40 uppercase">
            Customers
          </p>
          <p className="mt-3 text-2xl">{customers}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#121212] p-5">
          <p className="text-[10px] tracking-[0.2em] text-[#f3efe6]/40 uppercase">
            Total orders
          </p>
          <p className="mt-3 text-2xl">{orders}</p>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-2xl border border-dashed border-white/15 p-5 text-sm tracking-[0.12em] uppercase transition hover:border-[#d4b483] hover:text-[#d4b483]"
        >
          View all orders →
        </Link>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#121212]">
        <div className="border-b border-white/10 px-5 py-4 text-[11px] tracking-[0.16em] uppercase">
          Recent paid orders
        </div>
        <ul className="divide-y divide-white/5 text-sm">
          {paid.slice(0, 10).map((o, i) => (
            <li key={i} className="flex justify-between px-5 py-3">
              <span className="text-[#f3efe6]/60">
                {o.createdAt.toLocaleDateString()} · {o.status}
              </span>
              <span>{formatPrice(Number(o.total))}</span>
            </li>
          ))}
          {paid.length === 0 ? (
            <li className="px-5 py-8 text-[#f3efe6]/45">No paid orders yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
