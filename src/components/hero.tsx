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
    <section className="relative min-h-[100svh] overflow-hidden bg-[#070707]">
      <div className="absolute inset-0">
        {product?.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            priority
            className="scale-105 object-cover object-center opacity-50"
            sizes="100vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-[#070707]/80 to-[#070707]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-[#070707]/50" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pt-32 pb-24 md:justify-center md:px-8 md:pb-28">
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-[family-name:var(--font-display)] text-5xl tracking-[0.28em] text-[#f7f3ea] sm:text-6xl md:text-7xl lg:text-8xl"
        >
          BODIQO
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-xl text-3xl leading-[1.15] font-light tracking-tight text-[#f7f3ea] sm:text-4xl md:text-5xl"
        >
          {headline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 max-w-md text-[15px] leading-relaxed text-[#f7f3ea]/65 md:text-base"
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
            className="rounded-full bg-[#4a8cff] px-8 py-3.5 text-[11px] font-semibold tracking-[0.24em] text-[#0b0b0b] uppercase shadow-[0_10px_40px_rgba(212,180,131,0.25)] transition hover:bg-[#6aa0ff] hover:shadow-[0_12px_48px_rgba(212,180,131,0.35)]"
          >
            {ctaLabel}
          </Link>
          {product ? (
            <Link
              href={`/product/${product.slug}`}
              className="rounded-full border border-white/20 px-8 py-3.5 text-[11px] font-semibold tracking-[0.24em] text-[#f7f3ea] uppercase transition hover:border-[#4a8cff] hover:text-[#4a8cff]"
            >
              Featured piece
            </Link>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
