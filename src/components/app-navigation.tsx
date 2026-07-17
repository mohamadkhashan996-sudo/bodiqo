"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  Ellipsis,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/logo";
import { useExperience } from "@/components/experience-provider";
import { useGuest } from "@/components/auth/guest-provider";
import { useSocket } from "@/hooks/use-socket";

const guestDesktop = [
  { href: "/home", key: "home", icon: House },
  { href: "/explore", key: "explore", icon: Compass },
  { href: "/shorts", key: "shorts", icon: Clapperboard },
  { href: "/trending", key: "trending", icon: Flame },
  { href: "/search", key: "search", icon: Search },
] as const;

const guestMobile = [
  { href: "/home", key: "home", icon: House },
  { href: "/explore", key: "explore", icon: Compass },
  { href: "/shorts", key: "shorts", icon: Clapperboard },
  { href: "/search", key: "search", icon: Search },
] as const;

const memberDesktop = [
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

const memberMobile = [
  { href: "/home", key: "home", icon: House },
  { href: "/explore", key: "explore", icon: Compass },
  { href: "/messages", key: "messages", icon: MessageCircle },
  { href: "/notifications", key: "notifications", icon: Bell },
  { href: "/settings", key: "more", icon: Ellipsis },
] as const;

const navItemClass =
  "min-w-0 flex-col items-center justify-center gap-1 px-2 py-2.5 text-center text-xs font-semibold tracking-tight lg:min-w-0 lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:px-4 lg:py-3 lg:text-left lg:text-sm lg:font-medium";

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  className,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  className?: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn("app-nav-item relative", active && "app-nav-item-active", className)}
      aria-current={active ? "page" : undefined}
    >
      <span className="relative shrink-0">
        <Icon className="size-5 lg:size-[1.125rem]" strokeWidth={1.75} aria-hidden />
        {badge && badge > 0 ? (
          <span className="absolute -right-2.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--signal)] px-1 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate">{label}</span>
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
  const { t, locale } = useExperience();
  const { openAuthGate } = useGuest();
  const { socket } = useSocket();
  const [unread, setUnread] = useState(0);
  const staff =
    role === "SUPPORT" ||
    role === "MODERATOR" ||
    role === "ADMIN" ||
    role === "OWNER" ||
    role === "SUPER_ADMIN";

  useEffect(() => {
    if (isGuest) return;
    const load = () => {
      void fetch("/api/notifications/unread")
        .then((r) => r.json())
        .then((d) => setUnread(Number(d.count) || 0))
        .catch(() => undefined);
    };
    load();
    const onNew = () => setUnread((n) => n + 1);
    socket?.on("notification:new", onNew);
    const timer = window.setInterval(load, 60000);
    return () => {
      socket?.off("notification:new", onNew);
      window.clearInterval(timer);
    };
  }, [isGuest, socket]);

  useEffect(() => {
    if (pathname.startsWith("/notifications")) {
      setUnread(0);
      if (!isGuest) {
        void fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }).catch(() => undefined);
      }
    }
  }, [pathname, isGuest]);

  const desktopItems = isGuest ? guestDesktop : memberDesktop;
  const mobileItems = isGuest ? guestMobile : memberMobile;

  function labelFor(key: string) {
    if (key === "more") return locale === "ar" ? "المزيد" : "More";
    return t("nav", key);
  }

  return (
    <aside className="sticky bottom-0 z-[var(--z-nav)] border-t-2 border-[var(--mist-strong)] bg-[var(--surface)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[var(--shadow-md)] lg:top-0 lg:h-screen lg:w-[17.5rem] lg:shrink-0 lg:border-t-0 lg:bg-transparent lg:px-4 lg:py-5 lg:pb-5 lg:shadow-none">
      <div className="flex h-auto w-full flex-col gap-2 lg:h-full lg:gap-2.5">
        <div className="hidden shrink-0 px-1 pt-1 lg:block">
          <BrandLockup href="/home" />
        </div>

        <div className="flex items-center justify-between gap-2 px-1 lg:hidden">
          <BrandLockup href="/home" />
          {isGuest ? (
            <button
              type="button"
              onClick={() => openAuthGate()}
              className="app-nav-item app-nav-item-cta !w-auto min-h-11 px-4"
            >
              <Sparkles className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>Join</span>
            </button>
          ) : handle ? (
            <Link
              href={`/u/${handle}`}
              className="app-nav-item !w-auto !gap-0 min-h-11 min-w-11 px-3"
              aria-label={t("nav", "profile")}
            >
              <UserRound className="size-5" strokeWidth={1.75} aria-hidden />
            </Link>
          ) : null}
        </div>

        {/* Mobile primary tabs */}
        <nav
          className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:hidden"
          aria-label="Primary"
        >
          {mobileItems.map(({ href, key, icon }) => {
            const active =
              key === "more"
                ? pathname.startsWith("/settings") ||
                  pathname.startsWith("/communities") ||
                  pathname.startsWith("/calls") ||
                  pathname.startsWith("/trending") ||
                  pathname.startsWith("/search")
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <NavItem
                key={`m-${href}-${key}`}
                href={href}
                label={labelFor(key)}
                icon={icon}
                active={active}
                badge={key === "notifications" ? unread : undefined}
                className={navItemClass}
              />
            );
          })}
        </nav>

        {/* Desktop full nav */}
        <nav
          className="hidden lg:flex lg:flex-1 lg:flex-col lg:content-start lg:gap-2.5"
          aria-label="Primary"
        >
          {desktopItems.map(({ href, key, icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <NavItem
                key={href}
                href={href}
                label={t("nav", key)}
                icon={icon}
                active={active}
                badge={key === "notifications" ? unread : undefined}
                className={navItemClass}
              />
            );
          })}

          {handle ? (
            <NavItem
              href={`/u/${handle}`}
              label={t("nav", "profile")}
              icon={UserRound}
              active={pathname.startsWith("/u/")}
              className={navItemClass}
            />
          ) : null}

          {staff ? (
            <NavItem
              href="/admin"
              label={t("nav", "admin")}
              icon={Shield}
              active={pathname.startsWith("/admin")}
              className={navItemClass}
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
