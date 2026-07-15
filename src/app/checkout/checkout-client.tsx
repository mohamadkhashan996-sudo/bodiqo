"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/catalog-types";

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, subtotal, clearCart } = useCart();
  const [error, setError] = useState<string | null>(
    searchParams.get("error")
      ? "Payment could not be completed. Please try again."
      : searchParams.get("cancelled")
        ? "PayPal checkout was cancelled."
        : null,
  );
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState("");

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
          className="mt-8 inline-block rounded-full bg-[#d4b483] px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase"
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
    const currentItems = useCart.getState().items;
    if (!currentItems.length) {
      setError("Your cart is empty.");
      setLoading(false);
      return;
    }

    const payload = {
      email: String(form.get("email") || "").trim(),
      shippingName: String(form.get("shippingName") || "").trim(),
      shippingPhone: String(form.get("shippingPhone") || "").trim(),
      shippingAddress: String(form.get("shippingAddress") || "").trim(),
      shippingCity: String(form.get("shippingCity") || "").trim(),
      shippingZip: String(form.get("shippingZip") || "").trim(),
      shippingCountry: String(form.get("shippingCountry") || "IL").trim() || "IL",
      couponCode: coupon.trim() || undefined,
      items: currentItems.map((item) => ({
        slug: item.slug,
        quantity: Number(item.quantity) || 1,
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

      if (data.payment === "paypal" && data.approveUrl) {
        window.location.href = data.approveUrl;
        return;
      }

      clearCart();
      router.push(
        data.redirectUrl || `/checkout/success?order=${data.orderNumber}`,
      );
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-24 md:px-8 md:pt-36 md:pb-32">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Checkout
      </h1>
      <p className="mt-3 text-sm text-[#f3efe6]/55">
        Secure payment via PayPal when enabled in Admin → Settings.
      </p>

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

          <label className="block">
            <span className="text-[11px] tracking-[0.18em] text-[#f3efe6]/45 uppercase">
              Coupon code
            </span>
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/12 bg-transparent px-4 py-3 text-[#f3efe6] outline-none focus:border-[#d4b483]"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#d4b483] px-8 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase shadow-[0_10px_40px_rgba(212,180,131,0.22)] transition hover:bg-[#e2c69a] disabled:opacity-60"
          >
            {loading ? "Processing…" : "Continue to payment"}
          </button>
        </form>

        <aside className="h-fit rounded-3xl border border-white/[0.08] bg-[#101010] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-8">
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
            <span>Estimated total</span>
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
      <span className="text-[11px] tracking-[0.18em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-white/12 bg-transparent px-4 py-3 text-[#f3efe6] transition outline-none focus:border-[#d4b483]"
      />
    </label>
  );
}
