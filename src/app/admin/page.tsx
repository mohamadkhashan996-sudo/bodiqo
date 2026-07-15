import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/catalog-types";
import { requireAdmin } from "@/lib/admin";

export default async function AdminHomePage() {
  await requireAdmin();

  let stats = {
    products: 0,
    orders: 0,
    customers: 0,
    revenue: 0,
  };
  let recentOrders: {
    id: string;
    orderNumber: string;
    email: string;
    status: string;
    total: number;
    createdAt: Date;
  }[] = [];

  try {
    const [products, orders, customers, paid, recent] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.order.aggregate({
        where: {
          status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    stats = {
      products,
      orders,
      customers,
      revenue: Number(paid._sum.total ?? 0),
    };
    recentOrders = recent.map((o) => ({
      ...o,
      total: Number(o.total),
    }));
  } catch {
    // DB offline
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          لوحة تحكم مثل Shopify — أدِر المتجر بدون كود
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Products",
            value: String(stats.products),
            href: "/admin/products",
          },
          {
            label: "Orders",
            value: String(stats.orders),
            href: "/admin/orders",
          },
          {
            label: "Customers",
            value: String(stats.customers),
            href: "/admin/customers",
          },
          {
            label: "Revenue",
            value: formatPrice(stats.revenue),
            href: "/admin/orders",
          },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-white/10 bg-[#121212] p-5 transition hover:border-[#4a8cff]/40"
          >
            <p className="text-[10px] tracking-[0.2em] text-[#f3efe6]/40 uppercase">
              {card.label}
            </p>
            <p className="mt-3 text-2xl text-[#f3efe6]">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#121212]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-sm tracking-[0.14em] uppercase">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs text-[#4a8cff]">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] tracking-[0.14em] text-[#f3efe6]/40 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-[#f3efe6]/45">
                    No orders yet. Start PostgreSQL and place a test order.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-white/5">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-[#4a8cff] hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[#f3efe6]/70">
                      {order.email}
                    </td>
                    <td className="px-5 py-3 text-[#f3efe6]/70">
                      {order.status}
                    </td>
                    <td className="px-5 py-3">{formatPrice(order.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { href: "/admin/products/new", label: "Add product" },
          { href: "/admin/dropship", label: "Dropship hub" },
          { href: "/admin/settings", label: "Store settings" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-2xl border border-dashed border-white/15 px-5 py-6 text-center text-sm tracking-[0.12em] uppercase transition hover:border-[#4a8cff] hover:text-[#4a8cff]"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
