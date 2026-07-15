"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/catalog-types";

type WishlistItem = {
  id: string;
  productId: string;
  product: {
    slug: string;
    title: string;
    price: number;
    image: string;
    inStock: boolean;
    category: string;
  };
};

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/wishlist");
    if (res.status === 401) {
      setError("sign-in");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(productId: string) {
    await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 text-sm text-[#f3efe6]/55">
        Loading wishlist…
      </div>
    );
  }

  if (error === "sign-in") {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
        <h1 className="font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
          Wishlist
        </h1>
        <p className="mt-6 text-sm text-[#f3efe6]/55">
          <Link href="/auth/sign-in?callbackUrl=/wishlist" className="text-[#4a8cff]">
            Sign in
          </Link>{" "}
          to save products to your wishlist.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        Saved
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Wishlist
      </h1>

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-[#f3efe6]/55">
          No saved items yet.{" "}
          <Link href="/shop" className="text-[#4a8cff]">
            Browse shop
          </Link>
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-white/10 rounded-3xl border border-white/[0.08] bg-[#101010]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-4 px-5 py-4"
            >
              <Link
                href={`/product/${item.product.slug}`}
                className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#121212]"
              >
                <Image
                  src={item.product.image}
                  alt={item.product.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.product.slug}`}
                  className="text-sm text-[#f3efe6] hover:text-[#4a8cff]"
                >
                  {item.product.title}
                </Link>
                <p className="text-xs text-[#f3efe6]/40">
                  {item.product.category}
                </p>
              </div>
              <p className="text-sm">{formatPrice(item.product.price)}</p>
              <button
                type="button"
                onClick={() => remove(item.productId)}
                className="text-xs tracking-[0.14em] text-[#f3efe6]/45 uppercase hover:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
