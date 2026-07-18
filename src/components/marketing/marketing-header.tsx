"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Clapperboard,
  Compass,
  MessageCircle,
  Search,
} from "lucide-react";

import { BrandLockup } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/explore", label: "Explore", Icon: Compass },
  { href: "/shorts", label: "Reels", Icon: Clapperboard },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/messages", label: "Messages", Icon: MessageCircle },
  { href: "/notifications", label: "Notifications", Icon: Bell },
] as const;

export function MarketingHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[var(--z-nav)]">
      <div className="section-shell px-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-4 md:px-6">
        <div className="glass-strong grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-header)] px-2.5 py-2.5 shadow-[var(--shadow-md)] sm:gap-3 sm:px-3.5 md:gap-5 md:px-5 md:py-3">
          <BrandLockup className="min-w-0 shrink-0" />

          <nav
            className="hidden items-center justify-center gap-1 lg:flex"
            aria-label="Marketing"
          >
            {navItems.map(({ href, label, Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-medium tracking-tight transition duration-[var(--duration)] ease-[var(--ease-out)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)]",
                    active
                      ? "bg-[var(--ink)] text-[var(--cloud-elevated)] shadow-[var(--shadow-sm)]"
                      : "text-[var(--ink)] hover:bg-[var(--cloud-elevated)] hover:shadow-[var(--shadow-sm)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 transition",
                      active
                        ? "text-[var(--ember)]"
                        : "group-hover:text-[var(--signal)]",
                    )}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2 md:gap-2.5">
            <Link
              href="/sign-in"
              className="hidden min-h-11 items-center justify-center rounded-[var(--radius-md)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 text-sm font-semibold tracking-tight text-[var(--ink)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--cloud-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)] sm:inline-flex"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="landing-cta-primary inline-flex min-h-11 items-center justify-center rounded-[var(--radius-nav)] border-2 border-[var(--ink)] px-3 text-[11px] font-semibold tracking-[0.03em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)] sm:px-5 sm:text-[12px]"
            >
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Create Account</span>
            </Link>
          </div>
        </div>

        <nav
          className="mt-2.5 flex [scrollbar-width:none] gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] lg:hidden [&::-webkit-scrollbar]:hidden"
          aria-label="Marketing mobile"
        >
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-[var(--radius-md)] border-2 px-3.5 py-2 text-xs font-semibold shadow-[var(--shadow-sm)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)]",
                  active
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--cloud-elevated)]"
                    : "border-[var(--mist-strong)] bg-[var(--surface)] text-[var(--muted-strong)] hover:text-[var(--ink)]",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
