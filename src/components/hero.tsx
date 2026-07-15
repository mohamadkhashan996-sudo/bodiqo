"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CatalogProduct } from "@/lib/catalog";

type HeroProps = {
  product: CatalogProduct;
};

export function Hero({ product }: HeroProps) {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#0b0b0b]">
      <div className="absolute inset-0">
        <Image
          src={product.image}
          alt={product.title}
          fill
          priority
          className="object-cover object-center opacity-55"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0b] via-[#0b0b0b]/75 to-[#0b0b0b]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-transparent to-[#0b0b0b]/40" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pt-28 pb-20 md:justify-center md:px-8 md:pb-24">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-[family-name:var(--font-display)] text-5xl tracking-[0.22em] text-[#f3efe6] sm:text-6xl md:text-7xl lg:text-8xl"
        >
          BODIQO
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-xl text-2xl leading-tight text-[#f3efe6] sm:text-3xl md:text-4xl"
        >
          Drive with intention.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 max-w-md text-sm leading-relaxed text-[#f3efe6]/70 md:text-base"
        >
          Premium car accessories engineered for modern vehicles — holders, dash
          cams, power, and care essentials.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/shop"
            className="bg-[#d4b483] px-7 py-3.5 text-[11px] font-semibold tracking-[0.22em] text-[#0b0b0b] uppercase transition hover:bg-[#e2c69a]"
          >
            Shop collection
          </Link>
          <Link
            href={`/product/${product.slug}`}
            className="border border-white/25 px-7 py-3.5 text-[11px] font-semibold tracking-[0.22em] text-[#f3efe6] uppercase transition hover:border-[#d4b483] hover:text-[#d4b483]"
          >
            Featured piece
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
