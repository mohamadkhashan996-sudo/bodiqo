import { fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await requireUser();
    const { userId } = await params;
    const key = await prisma.userEncryptionKey.findUnique({
      where: { userId },
      select: { publicKey: true },
    });
    return ok({ publicKey: key?.publicKey ?? null });
  } catch (error) {
    return fail(error);
  }
}
