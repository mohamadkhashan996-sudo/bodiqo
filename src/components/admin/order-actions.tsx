"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OrderActions({
  orderId,
  status,
  trackingNumber,
  carrier,
}: {
  orderId: string;
  status: string;
  trackingNumber: string;
  carrier: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: form.get("status"),
        trackingNumber: form.get("trackingNumber"),
        carrier: form.get("carrier"),
      }),
    });
    if (!res.ok) {
      setMessage("Update failed");
      return;
    }
    setMessage("Order updated");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
    >
      <h2 className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        Fulfillment
      </h2>
      <label className="block text-sm">
        <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
          Status
        </span>
        <select
          name="status"
          defaultValue={status}
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
        >
          {(
            [
              ["PENDING", "Pending / قيد الانتظار"],
              ["AWAITING_PAYMENT", "Awaiting payment / بانتظار الدفع"],
              ["PAID", "Paid / مدفوع"],
              ["PROCESSING", "Processing / قيد التجهيز"],
              ["SHIPPED", "Shipped / تم الشحن"],
              ["DELIVERED", "Delivered / تم التسليم"],
              ["CANCELLED", "Cancelled / ملغى"],
              ["REFUNDED", "Refunded / مسترجع"],
            ] as const
          ).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
          Carrier
        </span>
        <input
          name="carrier"
          defaultValue={carrier}
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
        />
      </label>
      <label className="block text-sm">
        <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
          Tracking number
        </span>
        <input
          name="trackingNumber"
          defaultValue={trackingNumber}
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
        />
      </label>
      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      <button
        type="submit"
        className="rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
      >
        Update order
      </button>
    </form>
  );
}
