"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, House, Search, Bell, Clapperboard, Settings, UserRound, MessageCircle, UsersRound, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/logo";

const items = [{ href: "/home", label: "Home", icon: House }, { href: "/explore", label: "Explore", icon: Compass }, { href: "/messages", label: "Messages", icon: MessageCircle }, { href: "/communities", label: "Communities", icon: UsersRound }, { href: "/calls", label: "Calls", icon: Phone }, { href: "/shorts", label: "Shorts", icon: Clapperboard }, { href: "/notifications", label: "Notifications", icon: Bell }, { href: "/search", label: "Search", icon: Search }, { href: "/settings", label: "Settings", icon: Settings }];
export function AppNavigation({ handle }: { handle?: string | null }) {
  const pathname = usePathname();
  return <aside className="sticky top-0 z-30 flex h-auto w-full items-center justify-between border-b border-[var(--mist)] bg-[var(--cloud)]/80 px-5 py-4 backdrop-blur-xl lg:h-screen lg:w-64 lg:flex-col lg:items-stretch lg:border-r lg:border-b-0 lg:px-6 lg:py-8"><BrandLockup href="/home" /><nav className="mt-0 flex gap-1 overflow-x-auto lg:mt-12 lg:block lg:space-y-1">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("inline-flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition", pathname === href || pathname.startsWith(`${href}/`) ? "bg-[var(--ink)] text-[var(--cloud)] shadow-lg" : "text-[var(--muted)] hover:bg-white/60 hover:text-[var(--ink)]")}><Icon className="size-4" /><span className="hidden xl:inline">{label}</span></Link>)}{handle && <Link href={`/u/${handle}`} className={cn("inline-flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition", pathname.startsWith("/u/") ? "bg-[var(--ink)] text-[var(--cloud)]" : "text-[var(--muted)] hover:bg-white/60 hover:text-[var(--ink)]")}><UserRound className="size-4" /><span className="hidden xl:inline">Profile</span></Link>}</nav><p className="hidden text-xs leading-5 text-[var(--muted)] lg:block">Make space for the people and ideas that move you.</p></aside>;
}
