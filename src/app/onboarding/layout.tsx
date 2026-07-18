import { redirect } from "next/navigation";

import { AppProviders } from "@/components/providers";
import { auth } from "@/modules/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (session.user.onboardingDone) redirect("/home");
  return <AppProviders>{children}</AppProviders>;
}
