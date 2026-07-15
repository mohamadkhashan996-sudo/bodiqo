"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OrderRow = {
  id: string;
  orderNumber: string;
  email: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingCountry: string;
  shippingPhone: string | null;
  fulfillStatus: string;
  supplierOrderId: string | null;
  trackingNumber: string | null;
  status: string;
  total: number;
  items: {
    id: string;
    title: string;
    quantity: number;
    price: number;
    supplierUrl: string | null;
    supplierSku: string | null;
  }[];
};

export default function DropshipOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [supplierOrderId, setSupplierOrderId] = useState("");

  async function load() {
    const res = await fetch("/api/admin/dropship/orders");
    const data = await res.json();
    setOrders(data.orders || []);
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function markOrdered() {
    if (!selected.length) return;
    const res = await fetch("/api/admin/dropship/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderIds: selected,
        fulfillStatus: "ORDERED_SUPPLIER",
        supplierOrderId: supplierOrderId || undefined,
      }),
    });
    if (!res.ok) {
      setMessage("Update failed");
      return;
    }
    setMessage(`Marked ${selected.length} order(s) as ordered from supplier`);
    setSelected([]);
    load();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-[#4a8cff] uppercase">
            Fulfillment
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            Supplier orders
          </h1>
          <p className="mt-2 text-sm text-[#f3efe6]/55">
            Export customer orders to place on AliExpress, then track
            fulfillment.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/dropship/orders?format=csv&fulfillStatus=UNFULFILLED"
            className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
          >
            Export unfulfilled CSV
          </a>
          <a
            href="/api/admin/dropship/orders?format=csv"
            className="rounded-full border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.16em] text-[#f3efe6]/70 uppercase"
          >
            Export all CSV
          </a>
          <Link
            href="/admin/dropship"
            className="rounded-full border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.16em] text-[#f3efe6]/70 uppercase"
          >
            Hub
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-[#121212] p-4">
        <label className="block text-sm">
          <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
            Supplier order ID
          </span>
          <input
            value={supplierOrderId}
            onChange={(e) => setSupplierOrderId(e.target.value)}
            placeholder="AliExpress order #"
            className="mt-2 block w-56 rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={markOrdered}
          disabled={!selected.length}
          className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase disabled:opacity-40"
        >
          Mark selected ordered ({selected.length})
        </button>
      </div>

      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}

      <div className="space-y-4">
        {orders.map((order) => (
          <article
            key={order.id}
            className="rounded-2xl border border-white/10 bg-[#121212] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(order.id)}
                  onChange={() => toggle(order.id)}
                  className="mt-1 accent-[#4a8cff]"
                />
                <div>
                  <p className="font-medium text-[#f3efe6]">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-[#f3efe6]/45">
                    {order.fulfillStatus} · {order.status} ·{" "}
                    {order.shippingName} · {order.email}
                  </p>
                </div>
              </label>
              <Link
                href={`/admin/orders/${order.id}`}
                className="text-xs text-[#4a8cff]"
              >
                Details
              </Link>
            </div>
            <p className="mt-3 text-sm text-[#f3efe6]/60">
              {order.shippingAddress}, {order.shippingCity},{" "}
              {order.shippingCountry}
              {order.shippingPhone ? ` · ${order.shippingPhone}` : ""}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap justify-between gap-2 border-t border-white/5 pt-2"
                >
                  <span>
                    {item.title} × {item.quantity}
                  </span>
                  <span className="text-[#f3efe6]/45">
                    {item.supplierUrl ? (
                      <a
                        href={item.supplierUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4a8cff] hover:underline"
                      >
                        Buy on supplier
                      </a>
                    ) : (
                      "No supplier link"
                    )}
                    {item.supplierSku ? ` · ${item.supplierSku}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {orders.length === 0 ? (
          <p className="text-sm text-[#f3efe6]/45">No orders yet.</p>
        ) : null}
      </div>
    </div>
  );
}
