import { prisma } from "@/lib/prisma";

export async function getPublicProfile(handle: string) {
  return prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: {
      id: true,
      name: true,
      handle: true,
      bio: true,
      image: true,
      createdAt: true,
    },
  });
}
