import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SetupWizard } from "@/components/setup-wizard";
import { isSetupComplete } from "@/lib/setup";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Admin setup | BODIQO",
  robots: { index: false, follow: false },
};

export default async function AdminSetupPage() {
  const complete = await isSetupComplete();

  if (complete) {
    const session = await auth();
    if (!session?.user?.id) {
      redirect("/auth/sign-in?callbackUrl=/admin/setup");
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
      redirect("/");
    }
    // Setup already finished — send admins to the console
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070707] px-5 py-16">
      <div className="w-full">
        <p className="mb-2 text-center text-[10px] tracking-[0.28em] text-[#4a8cff] uppercase">
          Administrator only
        </p>
        <p className="mb-6 text-center font-[family-name:var(--font-display)] text-3xl tracking-[0.28em] text-[#f3efe6]">
          BODIQO
        </p>
        <SetupWizard />
      </div>
    </div>
  );
}
