"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=Dash%20Cameras", label: "Dash Cams" },
  { href: "/shop?category=Interior%20Accessories", label: "Interior" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const itemCount = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);
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
          ? "border-b border-white/10 bg-[#0b0b0b]/90 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-8">
        <button
          type="button"
          className="inline-flex items-center justify-center text-[#f3efe6] md:hidden"
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 font-[family-name:var(--font-display)] text-2xl tracking-[0.28em] text-[#f3efe6] md:static md:translate-x-0"
        >
          BODIQO
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] font-medium tracking-[0.22em] text-[#f3efe6]/70 uppercase transition hover:text-[#d4b483]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-5">
          <Link
            href="/auth/sign-in"
            className="hidden text-[#f3efe6]/80 transition hover:text-[#d4b483] md:inline-flex"
            aria-label="Account"
          >
            <User size={18} />
          </Link>
          <Link
            href="/cart"
            className="relative text-[#f3efe6] transition hover:text-[#d4b483]"
            aria-label="Cart"
          >
            <ShoppingBag size={18} />
            {mounted && itemCount > 0 ? (
              <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d4b483] px-1 text-[10px] font-semibold text-[#0b0b0b]">
                {itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-[#0b0b0b] px-5 py-6 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm tracking-[0.18em] text-[#f3efe6]/85 uppercase"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/auth/sign-in"
              className="text-sm tracking-[0.18em] text-[#d4b483] uppercase"
            >
              Account
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
