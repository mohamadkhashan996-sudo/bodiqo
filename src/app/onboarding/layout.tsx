import { auth } from "@/modules/auth";
import { redirect } from "next/navigation";
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) { const session = await auth(); if (!session?.user) redirect("/sign-in"); if (session.user.onboardingDone) redirect("/home"); return children; }
