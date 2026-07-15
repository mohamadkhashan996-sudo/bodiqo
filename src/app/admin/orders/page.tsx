import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/catalog-types";

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Orders
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          تتبع الدفع والشحن — غيّر الحالة من داخل كل طلب بسهولة
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121212] text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="hidden px-4 py-3 md:table-cell">Tracking</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="text-[#4a8cff] hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#f3efe6]/70">{o.email}</td>
                <td className="px-4 py-3">{o.status}</td>
                <td className="px-4 py-3">{formatPrice(Number(o.total))}</td>
                <td className="hidden px-4 py-3 text-[#f3efe6]/55 md:table-cell">
                  {o.trackingNumber || "—"}
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[#f3efe6]/45">
                  No orders yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
