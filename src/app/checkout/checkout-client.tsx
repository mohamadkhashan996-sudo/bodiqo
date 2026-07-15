"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart, cartLineKey } from "@/store/cart";
import { formatPrice } from "@/lib/catalog-types";

type PaymentOptions = {
  paypal: boolean;
  stripe: boolean;
  crypto: boolean;
  cryptoWallets: { coin: string; network: string; enabled: boolean }[];
};

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, subtotal, clearCart } = useCart();
  const [error, setError] = useState<string | null>(
    searchParams.get("error")
      ? "Payment could not be completed. Please try again."
      : searchParams.get("cancelled")
        ? "Checkout was cancelled."
        : null,
  );
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "paypal" | "stripe" | "crypto" | "none"
  >("none");
  const [cryptoCoin, setCryptoCoin] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("");
  const [options, setOptions] = useState<PaymentOptions | null>(null);

  const total = subtotal();
  const shipping = total === 0 ? 0 : total >= 250 ? 0 : 29.9;

  useEffect(() => {
    fetch("/api/checkout/options")
      .then((r) => r.json())
      .catch(() => ({
        paypal: false,
        stripe: false,
        crypto: false,
        cryptoWallets: [],
      }))
      .then((data) => {
        const wallets = data.cryptoWallets ?? [];
        const opts: PaymentOptions = {
          paypal: Boolean(data.paypal),
          stripe: Boolean(data.stripe),
          crypto: Boolean(data.crypto) && wallets.length > 0,
          cryptoWallets: wallets,
        };
        setOptions(opts);
        if (opts.paypal) setPaymentMethod("paypal");
        else if (opts.stripe) setPaymentMethod("stripe");
        else if (opts.crypto) {
          setPaymentMethod("crypto");
          setCryptoCoin(wallets[0]?.coin ?? "");
          setCryptoNetwork(wallets[0]?.network ?? "");
        }
      });
  }, []);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-36 pb-24 text-center md:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
          Nothing to checkout
        </h1>
        <Link
          href="/shop"
          className="mt-8 inline-block rounded-full bg-[#4a8cff] px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase"
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
      shippingCountry:
        String(form.get("shippingCountry") || "IL").trim() || "IL",
      couponCode: coupon.trim() || undefined,
      paymentMethod,
      cryptoCoin: paymentMethod === "crypto" ? cryptoCoin : undefined,
      cryptoNetwork: paymentMethod === "crypto" ? cryptoNetwork : undefined,
      items: currentItems.map((item) => ({
        slug: item.slug,
        quantity: Number(item.quantity) || 1,
        variantId: item.variantId,
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

      if (data.payment === "stripe" && data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.payment === "crypto" && data.redirectUrl) {
        clearCart();
        router.push(data.redirectUrl);
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
        Pay with PayPal, Stripe, crypto, or place a manual order.
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
              className="mt-2 w-full rounded-xl border border-white/12 bg-transparent px-4 py-3 text-[#f3efe6] outline-none focus:border-[#4a8cff]"
            />
          </label>

          {options ? (
            <fieldset className="space-y-3 rounded-2xl border border-white/10 p-4">
              <legend className="px-1 text-[11px] tracking-[0.18em] text-[#f3efe6]/45 uppercase">
                Payment method
              </legend>
              {options.paypal ? (
                <PaymentRadio
                  checked={paymentMethod === "paypal"}
                  onChange={() => setPaymentMethod("paypal")}
                  label="PayPal"
                />
              ) : null}
              {options.stripe ? (
                <PaymentRadio
                  checked={paymentMethod === "stripe"}
                  onChange={() => setPaymentMethod("stripe")}
                  label="Card (Stripe)"
                />
              ) : null}
              {options.crypto ? (
                <PaymentRadio
                  checked={paymentMethod === "crypto"}
                  onChange={() => setPaymentMethod("crypto")}
                  label="Cryptocurrency"
                />
              ) : null}
              {!options.paypal && !options.stripe && !options.crypto ? (
                <PaymentRadio
                  checked={paymentMethod === "none"}
                  onChange={() => setPaymentMethod("none")}
                  label="Manual order (no online payment)"
                />
              ) : null}
              {paymentMethod === "crypto" && options.cryptoWallets.length ? (
                <select
                  value={`${cryptoCoin}|${cryptoNetwork}`}
                  onChange={(e) => {
                    const [coin, network] = e.target.value.split("|");
                    setCryptoCoin(coin);
                    setCryptoNetwork(network);
                  }}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
                >
                  {options.cryptoWallets.map((w) => (
                    <option
                      key={`${w.coin}-${w.network}`}
                      value={`${w.coin}|${w.network}`}
                    >
                      {w.coin} ({w.network})
                    </option>
                  ))}
                </select>
              ) : null}
            </fieldset>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#4a8cff] px-8 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase shadow-[0_10px_40px_rgba(74,140,255,0.22)] transition hover:bg-[#6aa0ff] disabled:opacity-60"
          >
            {loading ? "Processing…" : "Continue to payment"}
          </button>
        </form>

        <aside className="h-fit rounded-3xl border border-white/[0.08] bg-[#101010] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-8">
          <h2 className="text-[11px] tracking-[0.22em] text-[#4a8cff] uppercase">
            Order
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-[#f3efe6]/75">
            {items.map((item) => (
              <li
                key={cartLineKey(item.productId, item.variantId)}
                className="flex justify-between gap-4"
              >
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
          <p className="mt-2 text-xs text-[#f3efe6]/45">
            Tax calculated at checkout based on shipping country.
          </p>
        </aside>
      </div>
    </div>
  );
}

function PaymentRadio({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input
        type="radio"
        name="paymentMethod"
        checked={checked}
        onChange={onChange}
        className="accent-[#4a8cff]"
      />
      {label}
    </label>
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
        className="mt-2 w-full rounded-xl border border-white/12 bg-transparent px-4 py-3 text-[#f3efe6] transition outline-none focus:border-[#4a8cff]"
      />
    </label>
  );
}
