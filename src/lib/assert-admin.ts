import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function assertAdminApi() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true },
  });
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
