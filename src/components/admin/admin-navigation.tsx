"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
  BadgeCheck,
  ChartColumn,
  ClipboardList,
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
  Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/logo";
import { can, type Permission } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
};

const nav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, permission: "admin:access" },
  { href: "/admin/users", label: "Users", icon: Users, permission: "users:read" },
  { href: "/admin/content", label: "Posts", icon: FileStack, permission: "content:read" },
  { href: "/admin/moderation", label: "Moderation", icon: Gavel, permission: "reports:read" },
  { href: "/admin/reports", label: "Reports", icon: Flag, permission: "reports:read" },
  { href: "/admin/analytics", label: "Analytics", icon: ChartColumn, permission: "analytics:read" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings:read" },
  { href: "/admin/auth", label: "Auth", icon: Fingerprint, permission: "users:read" },
  { href: "/admin/verification", label: "Verification", icon: BadgeCheck, permission: "verification:read" },
  { href: "/admin/monitoring", label: "Monitoring", icon: Activity, permission: "monitoring:read" },
  { href: "/admin/audit", label: "Audit", icon: ClipboardList, permission: "monitoring:read" },
  { href: "/admin/media", label: "Media", icon: HardDrive, permission: "media:read" },
  { href: "/admin/backups", label: "Backups", icon: Archive, permission: "backups:read" },
  { href: "/admin/roles", label: "Roles", icon: KeyRound, permission: "roles:read" },
  { href: "/admin/search", label: "Search", icon: Search, permission: "search:admin" },
];

export function AdminNavigation({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const items = nav.filter(
    (item) => !item.permission || can(role, item.permission),
  );

  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full flex-col border-b-2 border-white/35 bg-[var(--ink)] px-5 py-5 text-[var(--cloud-elevated)] lg:h-screen lg:w-64 lg:border-r-2 lg:border-b-0 lg:px-6 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <BrandLockup href="/admin" />
        <Shield className="size-4 text-[var(--signal)]" />
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/80">
        Control center
      </p>
      <nav className="mt-6 flex gap-1 overflow-x-auto lg:mt-8 lg:block lg:space-y-1">
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
                "inline-flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-sm font-semibold transition",
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
