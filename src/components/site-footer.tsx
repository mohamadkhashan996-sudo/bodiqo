import Link from "next/link";
import { CATEGORIES } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#080808] text-[#f3efe6]">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:px-8">
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-[0.28em]">
            BODIQO
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#f3efe6]/60">
            Premium marketplace for electronics, home, fashion, beauty, sports,
            and everyday essentials — designed for clarity and craft.
          </p>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
            Explore
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#f3efe6]/70">
            <li>
              <Link href="/shop" className="hover:text-[#4a8cff]">
                Shop
              </Link>
            </li>
            <li>
              <Link href="/categories" className="hover:text-[#4a8cff]">
                Categories
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-[#4a8cff]">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/track-order" className="hover:text-[#4a8cff]">
                Track order
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[#4a8cff]">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-[#4a8cff]">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
            Categories
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#f3efe6]/70">
            {CATEGORIES.slice(0, 8).map((cat) => (
              <li key={cat}>
                <Link
                  href={`/shop?category=${encodeURIComponent(cat)}`}
                  className="hover:text-[#4a8cff]"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
            Policies
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#f3efe6]/70">
            <li>
              <Link href="/privacy" className="hover:text-[#4a8cff]">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-[#4a8cff]">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/refund" className="hover:text-[#4a8cff]">
                Refunds
              </Link>
            </li>
            <li>
              <Link href="/shipping-policy" className="hover:text-[#4a8cff]">
                Shipping
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-[#4a8cff]">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-6 text-center text-xs tracking-[0.16em] text-[#f3efe6]/40 uppercase md:px-8">
        © {new Date().getFullYear()} BODIQO · Premium marketplace
      </div>
    </footer>
  );
}
