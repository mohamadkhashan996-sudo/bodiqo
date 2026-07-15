import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/catalog-types";
import { OrderActions } from "@/components/admin/order-actions";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.18em] text-[#4a8cff] uppercase">
          Order
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          {order.orderNumber}
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          {order.status} · {order.email}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#121212] p-6">
        <h2 className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
          Items
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {item.title} × {item.quantity}
              </span>
              <span>{formatPrice(Number(item.price) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between text-[#f3efe6]/60">
            <span>Subtotal</span>
            <span>{formatPrice(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-[#f3efe6]/60">
            <span>Shipping</span>
            <span>{formatPrice(Number(order.shipping))}</span>
          </div>
          <div className="flex justify-between text-[#f3efe6]/60">
            <span>Discount</span>
            <span>-{formatPrice(Number(order.discount))}</span>
          </div>
          <div className="flex justify-between text-base">
            <span>Total</span>
            <span>{formatPrice(Number(order.total))}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#121212] p-6 text-sm text-[#f3efe6]/70">
        <h2 className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
          Shipping
        </h2>
        <p className="mt-3">{order.shippingName}</p>
        <p>{order.shippingAddress}</p>
        <p>
          {order.shippingCity} {order.shippingZip}
        </p>
        <p>{order.shippingCountry}</p>
        {order.shippingPhone ? <p>{order.shippingPhone}</p> : null}
        {order.paypalCaptureId ? (
          <p className="mt-4 text-xs text-[#8fdfb0]">
            PayPal capture: {order.paypalCaptureId}
          </p>
        ) : null}
      </div>

      <OrderActions
        orderId={order.id}
        status={order.status}
        trackingNumber={order.trackingNumber || ""}
        carrier={order.carrier || ""}
      />
    </div>
  );
}
