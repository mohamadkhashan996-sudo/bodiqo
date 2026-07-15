"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/catalog";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const total = subtotal();
  const shipping = total === 0 ? 0 : total >= 250 ? 0 : 29.9;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-36 pb-24 text-center md:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
          Nothing to checkout
        </h1>
        <Link
          href="/shop"
          className="mt-8 inline-block bg-[#d4b483] px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase"
        >
          Browse shop
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email")),
      shippingName: String(form.get("shippingName")),
      shippingPhone: String(form.get("shippingPhone") || ""),
      shippingAddress: String(form.get("shippingAddress")),
      shippingCity: String(form.get("shippingCity")),
      shippingZip: String(form.get("shippingZip") || ""),
      shippingCountry: String(form.get("shippingCountry") || "IL"),
      items: items.map((item) => ({
        slug: item.slug,
        quantity: item.quantity,
      })),
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Checkout failed.");
        setLoading(false);
        return;
      }
      clearCart();
      router.push(`/checkout/success?order=${data.orderNumber}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-20 md:px-8 md:pt-32 md:pb-28">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Checkout
      </h1>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Email" name="email" type="email" required />
          <Field label="Full name" name="shippingName" required />
          <Field label="Phone" name="shippingPhone" />
          <Field label="Address" name="shippingAddress" required />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City" name="shippingCity" required />
            <Field label="Postal code" name="shippingZip" />
          </div>
          <Field label="Country" name="shippingCountry" defaultValue="IL" />

          {error ? (
            <p className="border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#d4b483] px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase transition hover:bg-[#e2c69a] disabled:opacity-60"
          >
            {loading ? "Placing order…" : "Place order"}
          </button>
        </form>

        <aside className="h-fit border border-white/10 bg-[#101010] p-6 md:p-8">
          <h2 className="text-[11px] tracking-[0.22em] text-[#d4b483] uppercase">
            Order
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-[#f3efe6]/75">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-4">
                <span>
                  {item.title} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-between border-t border-white/10 pt-4 text-[#f3efe6]">
            <span>Total</span>
            <span>{formatPrice(total + shipping)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.18em] text-[#f3efe6]/55 uppercase">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full border border-white/15 bg-transparent px-4 py-3 text-[#f3efe6] outline-none focus:border-[#d4b483]"
      />
    </label>
  );
}
