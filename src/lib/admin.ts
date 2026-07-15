import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const ADMIN_ROLES = new Set(["ADMIN", "STAFF"]);

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!user || !ADMIN_ROLES.has(user.role)) {
    redirect("/");
  }

  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAdmin();
  if (user.role !== "ADMIN") {
    redirect("/admin");
  }
  return user;
}
