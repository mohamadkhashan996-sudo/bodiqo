import { redirect } from "next/navigation";

import { AppMain } from "@/components/app-main";
import { AppNavigation } from "@/components/app-navigation";
import { BrowseRestore } from "@/components/auth/browse-restore";
import { SplashScreen } from "@/components/motion/splash";
import { AppProviders } from "@/components/providers";
import { RealtimeProvider } from "@/components/realtime-provider";
import { isStaff } from "@/lib/permissions";
import { isMaintenanceMode } from "@/modules/admin/services/settings";
import { auth } from "@/modules/auth";

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
    <AppProviders>
      <SplashScreen />
      <BrowseRestore />
      {session?.user ? (
        <RealtimeProvider>
          <div className="app-shell overflow-x-hidden lg:flex">
            <AppNavigation
              handle={session.user.handle}
              role={session.user.role}
              isGuest={false}
            />
            <AppMain>{children}</AppMain>
          </div>
        </RealtimeProvider>
      ) : (
        <div className="app-shell overflow-x-hidden lg:flex">
          <AppNavigation isGuest />
          <AppMain>{children}</AppMain>
        </div>
      )}
    </AppProviders>
  );
}
