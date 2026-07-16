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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/logo";
import { useExperience } from "@/components/experience-provider";
import { useGuest } from "@/components/auth/guest-provider";

const guestItems = [
  { href: "/home", key: "home", icon: House },
  { href: "/explore", key: "explore", icon: Compass },
  { href: "/shorts", key: "shorts", icon: Clapperboard },
  { href: "/search", key: "search", icon: Search },
] as const;

const memberItems = [
  { href: "/home", key: "home", icon: House },
  { href: "/explore", key: "explore", icon: Compass },
  { href: "/messages", key: "messages", icon: MessageCircle },
  { href: "/communities", key: "communities", icon: UsersRound },
  { href: "/calls", key: "calls", icon: Phone },
  { href: "/shorts", key: "shorts", icon: Clapperboard },
  { href: "/notifications", key: "notifications", icon: Bell },
  { href: "/search", key: "search", icon: Search },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

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
    <aside className="sticky top-0 z-30 flex h-auto w-full items-center justify-between border-b border-[var(--mist)] bg-[var(--glass)] px-5 py-4 backdrop-blur-xl lg:h-screen lg:w-64 lg:flex-col lg:items-stretch lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
      <BrandLockup href="/home" />
      <nav className="mt-0 flex gap-1 overflow-x-auto lg:mt-12 lg:block lg:space-y-1" aria-label="Primary">
        {items.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-[var(--ink)] text-[var(--cloud)] shadow-lg"
                  : "text-[var(--muted)] hover:bg-white/50 hover:text-[var(--ink)] dark:hover:bg-white/5",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="hidden xl:inline">{t("nav", key)}</span>
            </Link>
          );
        })}
        {handle ? (
          <Link
            href={`/u/${handle}`}
            className={cn(
              "inline-flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
              pathname.startsWith("/u/")
                ? "bg-[var(--ink)] text-[var(--cloud)]"
                : "text-[var(--muted)] hover:bg-white/50 hover:text-[var(--ink)]",
            )}
          >
            <UserRound className="size-4" aria-hidden />
            <span className="hidden xl:inline">{t("nav", "profile")}</span>
          </Link>
        ) : null}
        {staff ? (
          <Link
            href="/admin"
            className={cn(
              "inline-flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
              pathname.startsWith("/admin")
                ? "bg-[var(--signal)] text-[var(--ink)]"
                : "text-[var(--muted)] hover:bg-white/50 hover:text-[var(--ink)]",
            )}
          >
            <Shield className="size-4" aria-hidden />
            <span className="hidden xl:inline">{t("nav", "admin")}</span>
          </Link>
        ) : null}
      </nav>
      {isGuest ? (
        <div className="hidden flex-col gap-2 lg:flex">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--cloud)]"
          >
            <LogIn className="size-4" />
            Sign In
          </Link>
          <button
            type="button"
            onClick={() => openAuthGate()}
            className="text-xs text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            Create account
          </button>
        </div>
      ) : (
        <p className="hidden text-xs leading-5 text-[var(--muted)] lg:block">
          {t("brand", "tagline")}
        </p>
      )}
    </aside>
  );
}
