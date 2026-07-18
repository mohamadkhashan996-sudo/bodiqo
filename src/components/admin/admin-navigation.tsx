"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
  BadgeCheck,
  Ban,
  ChartColumn,
  ClipboardList,
  FileStack,
  Fingerprint,
  Flag,
  Gavel,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
  Users,
} from "lucide-react";

import { BrandLockup } from "@/components/brand/logo";
import { can, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
};

const nav: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    permission: "admin:access",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    permission: "users:read",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: Flag,
    permission: "reports:read",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: ChartColumn,
    permission: "analytics:read",
  },
  {
    href: "/admin/moderation",
    label: "Moderation",
    icon: Gavel,
    permission: "reports:read",
  },
  {
    href: "/admin/banned",
    label: "Banned users",
    icon: Ban,
    permission: "users:read",
  },
  {
    href: "/admin/content",
    label: "Content review",
    icon: FileStack,
    permission: "content:read",
  },
  {
    href: "/admin/settings",
    label: "System settings",
    icon: Settings,
    permission: "settings:read",
  },
  {
    href: "/admin/auth",
    label: "Auth",
    icon: Fingerprint,
    permission: "users:read",
  },
  {
    href: "/admin/verification",
    label: "Verification",
    icon: BadgeCheck,
    permission: "verification:read",
  },
  {
    href: "/admin/monitoring",
    label: "Monitoring",
    icon: Activity,
    permission: "monitoring:read",
  },
  {
    href: "/admin/audit",
    label: "Audit",
    icon: ClipboardList,
    permission: "monitoring:read",
  },
  {
    href: "/admin/media",
    label: "Media",
    icon: HardDrive,
    permission: "media:read",
  },
  {
    href: "/admin/backups",
    label: "Backups",
    icon: Archive,
    permission: "backups:read",
  },
  {
    href: "/admin/roles",
    label: "Roles",
    icon: KeyRound,
    permission: "roles:read",
  },
  {
    href: "/admin/search",
    label: "Search",
    icon: Search,
    permission: "search:admin",
  },
];

export function AdminNavigation({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const items = nav.filter(
    (item) => !item.permission || can(role, item.permission),
  );

  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full flex-col border-b-2 border-white/35 bg-[var(--ink)] px-3 py-4 text-[var(--cloud-elevated)] sm:px-5 sm:py-5 lg:h-screen lg:w-64 lg:border-r-2 lg:border-b-0 lg:px-6 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <BrandLockup
          href="/admin"
          className="[&_span]:text-base [&_span]:tracking-[0.2em] sm:[&_span]:text-xl"
        />
        <Shield className="size-4 shrink-0 text-[var(--signal)]" />
      </div>
      <p className="mt-3 text-[10px] tracking-[0.2em] text-white/80 uppercase">
        Control center
      </p>
      <nav className="mt-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] lg:mt-8 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-xs font-semibold transition sm:gap-3 sm:text-sm lg:w-full",
                active
                  ? "border-[var(--signal)] bg-[var(--signal)] text-[var(--ink)]"
                  : "border-transparent text-white/90 hover:border-white/35 hover:bg-white/12 hover:text-white",
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
        className="mt-auto hidden pt-8 text-xs font-semibold text-white/85 hover:text-white lg:block"
      >
        ← Back to Relune
      </Link>
    </aside>
  );
}
