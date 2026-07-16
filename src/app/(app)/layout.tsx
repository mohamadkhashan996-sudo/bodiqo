import { redirect } from "next/navigation";
import { auth } from "@/modules/auth";
import { AppNavigation } from "@/components/app-navigation";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!session.user.onboardingDone) redirect("/onboarding");
  return <div className="min-h-screen bg-[var(--cloud)] text-[var(--ink)] lg:flex"><AppNavigation handle={session.user.handle} /><main className="min-w-0 flex-1 px-5 py-8 md:px-8 lg:px-12 lg:py-10">{children}</main></div>;
}
