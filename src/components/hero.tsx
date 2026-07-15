"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CatalogProduct } from "@/lib/catalog-types";

type HeroProps = {
  product?: CatalogProduct;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
};

export function Hero({
  product,
  headline,
  subheadline,
  ctaLabel,
  ctaHref,
}: HeroProps) {
  return (
    <section className="relative min-h-[92svh] overflow-hidden bg-[var(--background)] md:min-h-[100svh]">
      <div className="absolute inset-0">
        {product?.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            priority
            className="scale-105 object-cover object-center opacity-55"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--accent)_35%,transparent),transparent_50%),linear-gradient(160deg,var(--background),var(--surface-2))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-[color-mix(in_srgb,var(--background)_82%,transparent)] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-[color-mix(in_srgb,var(--background)_45%,transparent)]" />
      </div>

      <div className="relative mx-auto flex min-h-[92svh] max-w-7xl flex-col justify-end px-5 pt-32 pb-20 md:min-h-[100svh] md:justify-center md:px-8 md:pb-28">
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-[family-name:var(--font-display)] text-5xl tracking-[0.28em] text-[var(--foreground)] sm:text-6xl md:text-7xl lg:text-8xl"
        >
          BODIQO
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-xl text-3xl leading-[1.15] font-light tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl"
        >
          {headline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--foreground)]/65 md:text-base"
        >
          {subheadline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Link
            href={ctaHref}
            className="rounded-full bg-[var(--accent)] px-8 py-3.5 text-[11px] font-semibold tracking-[0.24em] text-[var(--on-accent)] uppercase shadow-[0_10px_40px_color-mix(in_srgb,var(--accent)_35%,transparent)] transition hover:bg-[var(--accent-hover)]"
          >
            {ctaLabel}
          </Link>
          <Link
            href="/shop"
            className="rounded-full border border-[var(--border)] px-8 py-3.5 text-[11px] font-semibold tracking-[0.24em] text-[var(--foreground)] uppercase transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Browse catalog
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
