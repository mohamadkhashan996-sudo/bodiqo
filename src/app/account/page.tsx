import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/catalog-types";
import { redirect } from "next/navigation";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in?callbackUrl=/account");
  }

  let orders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: Date;
    trackingNumber: string | null;
  }[] = [];

  try {
    const rows = await prisma.order.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { email: session.user.email ?? undefined },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    orders = rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt,
      trackingNumber: o.trackingNumber,
    }));
  } catch {
    orders = [];
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
      <p className="text-[11px] tracking-[0.24em] text-[#d4b483] uppercase">
        Account
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        {session.user.name || "Welcome"}
      </h1>
      <p className="mt-3 text-sm text-[#f3efe6]/55">{session.user.email}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {session.user.role === "ADMIN" ? (
          <Link
            href="/admin"
            className="rounded-full bg-[#d4b483] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
          >
            Admin dashboard
          </Link>
        ) : null}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded-full border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.16em] text-[#f3efe6]/70 uppercase"
          >
            Sign out
          </button>
        </form>
      </div>

      <section className="mt-12 rounded-3xl border border-white/[0.08] bg-[#101010]">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-[11px] tracking-[0.18em] text-[#f3efe6]/45 uppercase">
            Orders
          </h2>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#f3efe6]/55">
            No orders yet.{" "}
            <Link href="/shop" className="text-[#d4b483]">
              Start shopping
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
              >
                <div>
                  <p className="text-[#f3efe6]">{order.orderNumber}</p>
                  <p className="text-xs text-[#f3efe6]/45">
                    {order.status}
                    {order.trackingNumber
                      ? ` · Tracking ${order.trackingNumber}`
                      : ""}
                  </p>
                </div>
                <p>{formatPrice(order.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
