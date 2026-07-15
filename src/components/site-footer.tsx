import Link from "next/link";
import { CATEGORIES } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#080808] text-[#f3efe6]">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-[0.28em]">
            BODIQO
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#f3efe6]/60">
            Premium automotive accessories crafted for drivers who expect more
            from every mile — design, durability, and detail.
          </p>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.24em] text-[#d4b483] uppercase">
            Explore
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#f3efe6]/70">
            <li>
              <Link href="/shop" className="hover:text-[#d4b483]">
                All products
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[#d4b483]">
                Our story
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-[#d4b483]">
                Cart
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.24em] text-[#d4b483] uppercase">
            Categories
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#f3efe6]/70">
            {CATEGORIES.slice(0, 6).map((cat) => (
              <li key={cat}>
                <Link
                  href={`/shop?category=${encodeURIComponent(cat)}`}
                  className="hover:text-[#d4b483]"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-6 text-center text-xs tracking-[0.16em] text-[#f3efe6]/40 uppercase md:px-8">
        © {new Date().getFullYear()} BODIQO · Premium automotive accessories
      </div>
    </footer>
  );
}
