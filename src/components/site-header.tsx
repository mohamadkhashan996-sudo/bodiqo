"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Heart,
  Menu,
  Monitor,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  User,
  X,
} from "lucide-react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/components/preferences-provider";
import type { ThemeMode } from "@/lib/i18n";

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const itemCount = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const {
    t,
    locale,
    currency,
    theme,
    languages,
    currencies,
    allowThemeSwitch,
    setLocale,
    setCurrency,
    setTheme,
  } = usePreferences();

  const links = [
    { href: "/shop", label: t("nav.shop") },
    { href: "/categories", label: t("nav.categories") },
    { href: "/blog", label: t("nav.blog") },
    { href: "/track-order", label: t("nav.track") },
    { href: "/about", label: t("nav.about") },
  ];

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
          ? "border-b border-[var(--border)] bg-[var(--header-bg)] shadow-[0_10px_40px_var(--shadow)] backdrop-blur-2xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:h-[4.5rem] md:gap-5 md:px-8">
        <button
          type="button"
          className="inline-flex items-center justify-center text-[var(--foreground)] md:hidden"
          aria-label={open ? t("common.close") : t("header.menu")}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link
          href="/"
          className="shrink-0 font-[family-name:var(--font-display)] text-xl tracking-[0.28em] text-[var(--foreground)] md:text-2xl md:tracking-[0.3em]"
        >
          BODIQO
        </Link>

        <nav
          className="hidden items-center gap-6 lg:flex xl:gap-8"
          aria-label="Primary"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] font-medium tracking-[0.18em] text-[var(--foreground)]/65 uppercase transition hover:text-[var(--accent)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <select
            aria-label={t("header.language")}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="hidden max-w-[7.5rem] truncate rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[10px] tracking-[0.08em] text-[var(--foreground)] sm:block"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>

          <select
            aria-label={t("header.currency")}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="hidden rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[10px] tracking-[0.08em] text-[var(--foreground)] sm:block"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>

          {allowThemeSwitch ? (
            <div
              className="hidden items-center rounded-full border border-[var(--border)] p-0.5 sm:flex"
              role="group"
              aria-label={t("header.theme")}
            >
              {(
                [
                  ["light", Sun, t("theme.light")],
                  ["dark", Moon, t("theme.dark")],
                  ["system", Monitor, t("theme.system")],
                ] as const
              ).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => setTheme(mode as ThemeMode)}
                  className={cn(
                    "rounded-full p-1.5 transition",
                    theme === mode
                      ? "bg-[var(--accent)] text-[var(--on-accent)]"
                      : "text-[var(--foreground)]/70 hover:text-[var(--accent)]",
                  )}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          ) : null}

          <Link
            href="/shop"
            className="hidden text-[var(--foreground)]/80 transition hover:text-[var(--accent)] md:inline-flex"
            aria-label={t("header.search")}
          >
            <Search size={18} />
          </Link>
          <Link
            href="/wishlist"
            className="hidden text-[var(--foreground)]/80 transition hover:text-[var(--accent)] md:inline-flex"
            aria-label={t("header.wishlist")}
          >
            <Heart size={18} />
          </Link>
          <Link
            href={session ? "/account" : "/auth/sign-in"}
            className="hidden text-[var(--foreground)]/80 transition hover:text-[var(--accent)] md:inline-flex"
            aria-label={t("header.account")}
          >
            <User size={18} />
          </Link>
          <Link
            href="/cart"
            className="relative text-[var(--foreground)] transition hover:text-[var(--accent)]"
            aria-label={`${t("header.cart")}${mounted && itemCount ? `, ${itemCount}` : ""}`}
          >
            <ShoppingBag size={18} />
            {mounted && itemCount > 0 ? (
              <span className="absolute -top-2 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--on-accent)]">
                {itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {open ? (
        <nav
          className="border-t border-[var(--border)] bg-[var(--header-bg)] px-5 py-6 backdrop-blur-xl md:hidden"
          aria-label="Mobile"
        >
          <ul className="space-y-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-sm tracking-[0.18em] text-[var(--foreground)]/80 uppercase"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/wishlist"
                className="block text-sm tracking-[0.18em] text-[var(--foreground)]/80 uppercase"
              >
                {t("header.wishlist")}
              </Link>
            </li>
          </ul>
          <div className="mt-6 grid gap-3">
            <label className="text-[10px] tracking-[0.16em] text-[var(--muted)] uppercase">
              {t("header.language")}
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] tracking-[0.16em] text-[var(--muted)] uppercase">
              {t("header.currency")}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </label>
            {allowThemeSwitch ? (
              <label className="text-[10px] tracking-[0.16em] text-[var(--muted)] uppercase">
                {t("header.theme")}
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ThemeMode)}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <option value="light">{t("theme.light")}</option>
                  <option value="dark">{t("theme.dark")}</option>
                  <option value="system">{t("theme.system")}</option>
                </select>
              </label>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
