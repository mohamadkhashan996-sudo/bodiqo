import { redirect } from "next/navigation";
import { auth } from "@/modules/auth";
import { AppNavigation } from "@/components/app-navigation";
import { RealtimeProvider } from "@/components/realtime-provider";
import { BrowseRestore } from "@/components/auth/browse-restore";
import { isMaintenanceMode } from "@/modules/admin/services/settings";
import { isStaff } from "@/lib/permissions";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user) {
    if (await isMaintenanceMode()) {
      if (!isStaff(session.user.role)) redirect("/maintenance");
    }
    if (!session.user.onboardingDone) redirect("/onboarding");
  }

  return (
    <>
      <BrowseRestore />
      {session?.user ? (
        <RealtimeProvider>
          <div className="min-h-screen bg-[var(--cloud)] text-[var(--ink)] lg:flex">
            <AppNavigation
              handle={session.user.handle}
              role={session.user.role}
              isGuest={false}
            />
            <main className="min-w-0 flex-1 px-5 py-8 md:px-8 lg:px-12 lg:py-10">
              {children}
            </main>
          </div>
        </RealtimeProvider>
      ) : (
        <div className="min-h-screen bg-[var(--cloud)] text-[var(--ink)] lg:flex">
          <AppNavigation isGuest />
          <main className="min-w-0 flex-1 px-5 py-8 md:px-8 lg:px-12 lg:py-10">
            {children}
          </main>
        </div>
      )}
    </>
  );
}
