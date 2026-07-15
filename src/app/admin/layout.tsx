import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { maybeRunAutoBackup } from "@/lib/backup";

export const metadata = {
  title: "Admin | BODIQO",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  // Fire-and-forget scheduled backup when an admin is active
  void maybeRunAutoBackup("admin-layout").catch(() => null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f3efe6]">
      {/* Hide storefront chrome for admin */}
      <style>{`body > main > :not([data-admin]), header:not([data-admin]), footer { }`}</style>
      <div className="flex min-h-screen" data-admin>
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-[#0e0e0e] lg:block">
          <div className="border-b border-white/10 px-5 py-6">
            <Link
              href="/admin"
              className="font-[family-name:var(--font-display)] text-xl tracking-[0.22em]"
            >
              BODIQO
            </Link>
            <p className="mt-1 text-[10px] tracking-[0.2em] text-[#4a8cff] uppercase">
              Admin
            </p>
          </div>
          <AdminNav />
          <div className="border-t border-white/10 px-5 py-4 text-xs text-[#f3efe6]/45">
            {admin.email}
          </div>
        </aside>
        <div className="flex-1">
          <header
            data-admin
            className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-[#0a0a0a]/90 px-4 backdrop-blur-xl lg:px-8"
          >
            <Link
              href="/admin"
              className="font-[family-name:var(--font-display)] tracking-[0.18em] lg:hidden"
            >
              BODIQO Admin
            </Link>
            <div className="ml-auto flex items-center gap-4 text-xs">
              <Link href="/" className="text-[#f3efe6]/55 hover:text-[#4a8cff]">
                View store
              </Link>
            </div>
          </header>
          <div className="px-4 py-8 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
