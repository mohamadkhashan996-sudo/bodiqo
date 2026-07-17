import { redirect } from "next/navigation";
import { auth } from "@/modules/auth";
import { isStaff } from "@/lib/permissions";
import { AdminNavigation } from "@/components/admin/admin-navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!isStaff(session.user.role)) redirect("/home");

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#f7f3ea_0%,_var(--cloud)_55%,_#e8efe8_100%)] text-[var(--ink)] lg:flex">
      <AdminNavigation role={session.user.role} />
      <main className="min-w-0 flex-1 px-5 py-8 md:px-8 lg:px-10 lg:py-10">
        <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <span>
            Signed in as{" "}
            <strong className="text-[var(--ink)]">
              {session.user.handle || session.user.email}
            </strong>{" "}
            · {session.user.role}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
