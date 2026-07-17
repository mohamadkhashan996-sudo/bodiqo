"use client";

import type { ComponentType } from "react";
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
  X,
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

const memberMobilePrimary = [
  { href: "/home", key: "home", icon: House },
  { href: "/shorts", key: "shorts", icon: Clapperboard },
  { href: "/messages", key: "messages", icon: MessageCircle },
  { href: "/notifications", key: "notifications", icon: Bell },
] as const;

const memberMoreLinks = [
  { href: "/explore", key: "explore", icon: Compass },
  { href: "/search", key: "search", icon: Search },
  { href: "/communities", key: "communities", icon: UsersRound },
  { href: "/calls", key: "calls", icon: Phone },
  { href: "/trending", key: "trending", icon: Flame },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

const navItemClass =
  "min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center text-[10px] font-semibold tracking-tight touch-manipulation sm:gap-1 sm:px-2 sm:text-xs lg:min-w-0 lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:px-4 lg:py-3 lg:text-left lg:text-sm lg:font-medium";

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  className,
  badge,
  onClick,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  className?: string;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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
  const [moreOpen, setMoreOpen] = useState(false);
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
    setMoreOpen(false);
  }, [pathname]);

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
  const moreActive = memberMoreLinks.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const hideMobileTopChrome =
    pathname.startsWith("/shorts") || pathname.startsWith("/messages/");

  function labelFor(key: string) {
    if (key === "more") return locale === "ar" ? "المزيد" : "More";
    return t("nav", key);
  }

  return (
    <>
      <aside className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t-2 border-[var(--mist-strong)] bg-[var(--surface)] px-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[var(--shadow-md)] lg:sticky lg:top-0 lg:h-screen lg:w-[17.5rem] lg:shrink-0 lg:border-t-0 lg:bg-transparent lg:px-4 lg:py-5 lg:pb-5 lg:shadow-none">
        <div className="flex h-auto w-full flex-col gap-1.5 lg:h-full lg:gap-2.5">
          <div className="hidden shrink-0 px-1 pt-1 lg:block">
            <BrandLockup href="/home" />
          </div>

          {/* Mobile primary tabs */}
          {isGuest ? (
            <nav
              className="grid grid-cols-4 gap-1 sm:gap-1.5 lg:hidden"
              aria-label="Primary"
            >
              {guestMobile.map(({ href, key, icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <NavItem
                    key={`m-${href}-${key}`}
                    href={href}
                    label={labelFor(key)}
                    icon={icon}
                    active={active}
                    className={navItemClass}
                  />
                );
              })}
            </nav>
          ) : (
            <nav
              className="grid grid-cols-5 gap-0.5 sm:gap-1 lg:hidden"
              aria-label="Primary"
            >
              {memberMobilePrimary.map(({ href, key, icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
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
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  "app-nav-item relative",
                  moreActive && "app-nav-item-active",
                  navItemClass,
                )}
                aria-expanded={moreOpen}
                aria-haspopup="dialog"
              >
                <Ellipsis className="size-5" strokeWidth={1.75} aria-hidden />
                <span className="max-w-full truncate">{labelFor("more")}</span>
              </button>
            </nav>
          )}

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

      {/* Compact mobile top chrome — hidden on immersive surfaces */}
      {!hideMobileTopChrome ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[calc(var(--z-nav)+1)] flex items-start justify-between gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden">
          <div className="pointer-events-auto">
            <BrandLockup
              href="/home"
              className="rounded-2xl bg-[var(--surface)]/90 px-2.5 py-1.5 shadow-[var(--shadow-sm)] backdrop-blur-md [&_span]:text-base [&_span]:tracking-[0.2em]"
            />
          </div>
          <div className="pointer-events-auto">
            {isGuest ? (
              <button
                type="button"
                onClick={() => openAuthGate()}
                className="app-nav-item app-nav-item-cta !w-auto min-h-11 touch-manipulation px-4 shadow-[var(--shadow-md)]"
              >
                <Sparkles className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>Join</span>
              </button>
            ) : handle ? (
              <Link
                href={`/u/${handle}`}
                className="app-nav-item !w-auto !gap-0 min-h-11 min-w-11 touch-manipulation px-3 shadow-[var(--shadow-md)]"
                aria-label={t("nav", "profile")}
              >
                <UserRound className="size-5" strokeWidth={1.75} aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {moreOpen ? (
        <div
          className="fixed inset-0 z-[calc(var(--z-nav)+5)] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={labelFor("more")}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[var(--ink)]/45 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[1.75rem] border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-xl)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--mist-strong)]" />
            <div className="mb-3 flex items-center justify-between">
              <p className="font-[family-name:var(--font-display)] text-lg">
                {labelFor("more")}
              </p>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-2xl border-2 border-[var(--mist-strong)] touch-manipulation"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-2">
              {memberMoreLinks.map(({ href, key, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 text-center text-xs font-semibold touch-manipulation",
                      active
                        ? "border-[var(--signal)] bg-[var(--signal)]/15 text-[var(--ink)]"
                        : "border-[var(--mist-strong)] bg-[var(--cloud)] text-[var(--ink)]",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                    <span>{labelFor(key)}</span>
                  </Link>
                );
              })}
              {handle ? (
                <Link
                  href={`/u/${handle}`}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--cloud)] px-2 py-3 text-center text-xs font-semibold touch-manipulation"
                >
                  <UserRound className="size-5" strokeWidth={1.75} />
                  <span>{t("nav", "profile")}</span>
                </Link>
              ) : null}
              {staff ? (
                <Link
                  href="/admin"
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--cloud)] px-2 py-3 text-center text-xs font-semibold touch-manipulation"
                >
                  <Shield className="size-5" strokeWidth={1.75} />
                  <span>{t("nav", "admin")}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
