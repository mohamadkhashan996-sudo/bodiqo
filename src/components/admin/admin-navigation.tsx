"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
  BadgeCheck,
  ChartColumn,
  Flag,
  HardDrive,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
  Users,
  FileStack,
  KeyRound,
  Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/logo";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/auth", label: "Auth", icon: Fingerprint },
  { href: "/admin/content", label: "Content", icon: FileStack },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/verification", label: "Verification", icon: BadgeCheck },
  { href: "/admin/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/admin/monitoring", label: "Monitoring", icon: Activity },
  { href: "/admin/media", label: "Media", icon: HardDrive },
  { href: "/admin/backups", label: "Backups", icon: Archive },
  { href: "/admin/roles", label: "Roles", icon: KeyRound },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/search", label: "Search", icon: Search },
];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full flex-col border-b border-[var(--mist)] bg-[var(--ink)] px-5 py-5 text-[var(--cloud)] lg:h-screen lg:w-64 lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <BrandLockup href="/admin" />
        <Shield className="size-4 text-[var(--signal)]" />
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/50">
        Control center
      </p>
      <nav className="mt-6 flex gap-1 overflow-x-auto lg:mt-8 lg:block lg:space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-[var(--signal)] text-[var(--ink)]"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </nav>
      <Link
        href="/home"
        className="mt-auto hidden pt-8 text-xs text-white/45 hover:text-white lg:block"
      >
        ← Back to Relune
      </Link>
    </aside>
  );
}
