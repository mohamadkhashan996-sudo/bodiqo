"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  House,
  Search,
  Bell,
  Clapperboard,
  Settings,
  UserRound,
  MessageCircle,
  UsersRound,
  Phone,
  Shield,
  LogIn,
  Flame,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/logo";
import { useExperience } from "@/components/experience-provider";
import { useGuest } from "@/components/auth/guest-provider";

const guestItems = [
  { href: "/home", key: "home", icon: House },
  { href: "/explore", key: "explore", icon: Compass },
  { href: "/shorts", key: "shorts", icon: Clapperboard },
  { href: "/trending", key: "trending", icon: Flame },
  { href: "/search", key: "search", icon: Search },
] as const;

const memberItems = [
  { href: "/home", key: "home", icon: House },
  { href: "/explore", key: "explore", icon: Compass },
  { href: "/messages", key: "messages", icon: MessageCircle },
  { href: "/communities", key: "communities", icon: UsersRound },
  { href: "/calls", key: "calls", icon: Phone },
  { href: "/shorts", key: "shorts", icon: Clapperboard },
  { href: "/trending", key: "trending", icon: Flame },
  { href: "/notifications", key: "notifications", icon: Bell },
  { href: "/search", key: "search", icon: Search },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  className,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("app-nav-item", active && "app-nav-item-active", className)}
    >
      <Icon className="size-[1.125rem] shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppNavigation({
  handle,
  role,
  isGuest = false,
}: {
  handle?: string | null;
  role?: string | null;
  isGuest?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useExperience();
  const { openAuthGate } = useGuest();
  const items = isGuest ? guestItems : memberItems;
  const staff =
    role === "SUPPORT" ||
    role === "MODERATOR" ||
    role === "ADMIN" ||
    role === "OWNER" ||
    role === "SUPER_ADMIN";

  return (
    <aside className="sticky bottom-0 z-[var(--z-nav)] px-3 pb-3 pt-3 lg:top-0 lg:h-screen lg:w-[17.5rem] lg:shrink-0 lg:px-4 lg:py-5">
      <div className="flex h-auto w-full flex-col gap-2.5 lg:h-full lg:gap-2.5">
        <div className="hidden shrink-0 px-1 pt-1 lg:block">
          <BrandLockup href="/home" />
        </div>

        <div className="flex items-center justify-between gap-2 lg:hidden">
          <BrandLockup href="/home" />
          {isGuest ? (
            <button
              type="button"
              onClick={() => openAuthGate()}
              className="app-nav-item app-nav-item-cta !w-auto px-4"
            >
              <Sparkles className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>Join</span>
            </button>
          ) : handle ? (
            <Link
              href={`/u/${handle}`}
              className="app-nav-item !w-auto !gap-0 px-3"
              aria-label={t("nav", "profile")}
            >
              <UserRound className="size-4" strokeWidth={1.75} aria-hidden />
            </Link>
          ) : null}
        </div>

        <nav
          className="grid grid-flow-col auto-cols-[minmax(4.4rem,1fr)] gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex lg:flex-1 lg:flex-col lg:content-start lg:gap-2.5 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
          aria-label="Primary"
        >
          {items.map(({ href, key, icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <NavItem
                key={href}
                href={href}
                label={t("nav", key)}
                icon={icon}
                active={active}
                className="min-w-[4.4rem] flex-col items-center justify-center gap-1 px-1.5 py-2.5 text-center text-[10px] lg:min-w-0 lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:px-4 lg:py-3 lg:text-left lg:text-sm"
              />
            );
          })}

          {handle ? (
            <NavItem
              href={`/u/${handle}`}
              label={t("nav", "profile")}
              icon={UserRound}
              active={pathname.startsWith("/u/")}
              className="hidden lg:inline-flex"
            />
          ) : null}

          {staff ? (
            <NavItem
              href="/admin"
              label={t("nav", "admin")}
              icon={Shield}
              active={pathname.startsWith("/admin")}
              className="hidden lg:inline-flex"
            />
          ) : null}
        </nav>

        {isGuest ? (
          <div className="mt-auto hidden flex-col gap-2.5 lg:flex">
            <Link href="/sign-in" className="app-nav-item">
              <LogIn className="size-[1.125rem] shrink-0" strokeWidth={1.75} aria-hidden />
              <span>Sign In</span>
            </Link>
            <button
              type="button"
              onClick={() => openAuthGate()}
              className="app-nav-item app-nav-item-cta"
            >
              <Sparkles className="size-[1.125rem] shrink-0" strokeWidth={1.75} aria-hidden />
              <span>Join RELUNE</span>
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
