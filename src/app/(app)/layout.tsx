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
          <div className="app-shell lg:flex">
            <AppNavigation
              handle={session.user.handle}
              role={session.user.role}
              isGuest={false}
            />
            <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-5 md:px-7 md:pb-16 lg:px-10 lg:pb-10 lg:pt-6 xl:px-12">
              {children}
            </main>
          </div>
        </RealtimeProvider>
      ) : (
        <div className="app-shell lg:flex">
          <AppNavigation isGuest />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-5 md:px-7 md:pb-16 lg:px-10 lg:pb-10 lg:pt-6 xl:px-12">
            {children}
          </main>
        </div>
      )}
    </>
  );
}
