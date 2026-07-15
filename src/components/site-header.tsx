"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/blog", label: "Blog" },
  { href: "/track-order", label: "Track" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const itemCount = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled || open
          ? "border-b border-white/[0.07] bg-[#070707]/85 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-[4.5rem] md:px-8">
        <button
          type="button"
          className="inline-flex items-center justify-center text-[#f3efe6] md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 font-[family-name:var(--font-display)] text-2xl tracking-[0.3em] text-[#f3efe6] md:static md:translate-x-0"
        >
          BODIQO
        </Link>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] font-medium tracking-[0.22em] text-[#f3efe6]/65 uppercase transition hover:text-[#4a8cff]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-5">
          <Link
            href="/shop"
            className="hidden text-[#f3efe6]/80 transition hover:text-[#4a8cff] md:inline-flex"
            aria-label="Search"
          >
            <Search size={18} />
          </Link>
          <Link
            href="/wishlist"
            className="hidden text-[#f3efe6]/80 transition hover:text-[#4a8cff] md:inline-flex"
            aria-label="Wishlist"
          >
            <Heart size={18} />
          </Link>
          <Link
            href={session ? "/account" : "/auth/sign-in"}
            className="hidden text-[#f3efe6]/80 transition hover:text-[#4a8cff] md:inline-flex"
            aria-label="Account"
          >
            <User size={18} />
          </Link>
          <Link
            href="/cart"
            className="relative text-[#f3efe6] transition hover:text-[#4a8cff]"
            aria-label={`Cart${mounted && itemCount ? `, ${itemCount} items` : ""}`}
          >
            <ShoppingBag size={18} />
            {mounted && itemCount > 0 ? (
              <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4a8cff] px-1 text-[10px] font-semibold text-[#0b0b0b]">
                {itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {open ? (
        <nav
          className="border-t border-white/[0.06] bg-[#070707]/95 px-5 py-6 md:hidden"
          aria-label="Mobile"
        >
          <ul className="space-y-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-sm tracking-[0.18em] text-[#f3efe6]/80 uppercase"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/wishlist"
                className="block text-sm tracking-[0.18em] text-[#f3efe6]/80 uppercase"
              >
                Wishlist
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
