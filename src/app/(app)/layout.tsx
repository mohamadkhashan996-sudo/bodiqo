import { redirect } from "next/navigation";
import { auth } from "@/modules/auth";
import { AppNavigation } from "@/components/app-navigation";
import { RealtimeProvider } from "@/components/realtime-provider";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!session.user.onboardingDone) redirect("/onboarding");
  return <RealtimeProvider><div className="min-h-screen bg-[var(--cloud)] text-[var(--ink)] lg:flex"><AppNavigation handle={session.user.handle} role={session.user.role} /><main className="min-w-0 flex-1 px-5 py-8 md:px-8 lg:px-12 lg:py-10">{children}</main></div></RealtimeProvider>;
}
