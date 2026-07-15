"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/catalog";
import { usePreferences } from "@/components/preferences-provider";

export function SiteFooter() {
  const { t } = usePreferences();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:px-8">
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-[0.28em]">
            BODIQO
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--foreground)]/60">
            Premium marketplace for electronics, home, fashion, beauty, sports,
            and everyday essentials — designed for clarity and craft.
          </p>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.24em] text-[var(--accent)] uppercase">
            {t("footer.explore")}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--foreground)]/70">
            <li>
              <Link href="/shop" className="hover:text-[var(--accent)]">
                {t("nav.shop")}
              </Link>
            </li>
            <li>
              <Link href="/categories" className="hover:text-[var(--accent)]">
                {t("nav.categories")}
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-[var(--accent)]">
                {t("nav.blog")}
              </Link>
            </li>
            <li>
              <Link href="/track-order" className="hover:text-[var(--accent)]">
                {t("nav.track")}
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[var(--accent)]">
                {t("nav.about")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-[var(--accent)]">
                {t("nav.contact")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.24em] text-[var(--accent)] uppercase">
            {t("footer.categories")}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--foreground)]/70">
            {CATEGORIES.slice(0, 8).map((cat) => (
              <li key={cat}>
                <Link
                  href={`/shop?category=${encodeURIComponent(cat)}`}
                  className="hover:text-[var(--accent)]"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.24em] text-[var(--accent)] uppercase">
            {t("footer.policies")}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--foreground)]/70">
            <li>
              <Link href="/privacy" className="hover:text-[var(--accent)]">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-[var(--accent)]">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/refund" className="hover:text-[var(--accent)]">
                Refunds
              </Link>
            </li>
            <li>
              <Link href="/shipping-policy" className="hover:text-[var(--accent)]">
                Shipping
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-[var(--accent)]">
                {t("nav.faq")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--border)] px-5 py-6 text-center text-xs tracking-[0.16em] text-[var(--foreground)]/40 uppercase md:px-8">
        © {new Date().getFullYear()} BODIQO · {t("footer.rights")}
      </div>
    </footer>
  );
}
