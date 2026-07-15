"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/catalog";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const total = subtotal();
  const shipping = total === 0 ? 0 : total >= 250 ? 0 : 29.9;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-36 pb-24 text-center md:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
          Your cart is empty
        </h1>
        <p className="mt-4 text-[#f3efe6]/60">
          Discover premium accessories for the road ahead.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-block bg-[#d4b483] px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-20 md:px-8 md:pt-32 md:pb-28">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Cart
      </h1>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_0.8fr]">
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-4 py-6 md:gap-6">
              <Link
                href={`/product/${item.slug}`}
                className="relative h-28 w-24 shrink-0 overflow-hidden bg-[#141414] md:h-32 md:w-28"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-[#f3efe6] transition hover:text-[#d4b483]"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm text-[#f3efe6]/55">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-xs tracking-[0.12em] text-[#f3efe6]/45 uppercase hover:text-[#d4b483]"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <label className="sr-only" htmlFor={`qty-${item.productId}`}>
                    Quantity
                  </label>
                  <select
                    id={`qty-${item.productId}`}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.productId, Number(e.target.value))
                    }
                    className="border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f3efe6]"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} className="bg-[#0b0b0b]">
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-[#f3efe6]/70">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit border border-white/10 bg-[#101010] p-6 md:p-8">
          <h2 className="text-[11px] tracking-[0.22em] text-[#d4b483] uppercase">
            Summary
          </h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between text-[#f3efe6]/70">
              <dt>Subtotal</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
            <div className="flex justify-between text-[#f3efe6]/70">
              <dt>Shipping</dt>
              <dd>
                {shipping === 0 ? "Complimentary" : formatPrice(shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-4 text-base text-[#f3efe6]">
              <dt>Total</dt>
              <dd>{formatPrice(total + shipping)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-[#f3efe6]/45">
            Free shipping on orders over ₪250.
          </p>
          <Link
            href="/checkout"
            className="mt-8 block bg-[#d4b483] px-6 py-3.5 text-center text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase transition hover:bg-[#e2c69a]"
          >
            Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
