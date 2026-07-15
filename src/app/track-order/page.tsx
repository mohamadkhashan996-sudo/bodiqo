"use client";

import { FormEvent, useState } from "react";
import { formatPrice } from "@/lib/catalog-types";

type TrackedOrder = {
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
  createdAt: string;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
};

export default function TrackOrderPage() {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/track-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: form.get("orderNumber"),
        email: form.get("email"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Order not found");
      return;
    }
    setOrder(data.order);
  }

  return (
    <div className="mx-auto max-w-xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        Orders
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Track order
      </h1>
      <p className="mt-4 text-sm text-[#f3efe6]/55">
        Enter your order number and email to view status and tracking.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-3xl border border-white/[0.08] bg-[#101010] p-6"
      >
        <input
          name="orderNumber"
          required
          placeholder="Order number"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm outline-none focus:border-[#4a8cff]"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email used at checkout"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm outline-none focus:border-[#4a8cff]"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.18em] text-[#0b0b0b] uppercase disabled:opacity-60"
        >
          {loading ? "Looking up…" : "Track order"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>

      {order ? (
        <section className="mt-8 rounded-3xl border border-white/[0.08] bg-[#101010]">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-sm font-medium text-[#f3efe6]">
              {order.orderNumber}
            </p>
            <p className="text-xs text-[#f3efe6]/45">
              {order.status}
              {order.trackingNumber
                ? ` · ${order.carrier || "Carrier"} ${order.trackingNumber}`
                : ""}
            </p>
          </div>
          <ul className="divide-y divide-white/5 px-5">
            {order.items.map((item, i) => (
              <li
                key={`${item.title}-${i}`}
                className="flex justify-between py-3 text-sm"
              >
                <span>
                  {item.title} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-white/10 px-5 py-4 text-sm">
            <p className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatPrice(order.total, order.currency)}</span>
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
