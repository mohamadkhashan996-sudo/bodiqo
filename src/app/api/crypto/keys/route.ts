import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse} from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const key = await prisma.userEncryptionKey.findUnique({
      where: { userId: user.id },
      select: { publicKey: true, updatedAt: true },
    });
    return ok({ publicKey: key?.publicKey ?? null });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    await guardApiAbuse(request, "crypto:keys:put");
    const user = await requireUser();
    const { publicKey } = await body(
      request,
      z.object({ publicKey: z.string().min(40).max(4000) }),
    );
    const key = await prisma.userEncryptionKey.upsert({
      where: { userId: user.id },
      create: { userId: user.id, publicKey },
      update: { publicKey },
      select: { publicKey: true },
    });
    return ok({ publicKey: key.publicKey });
  } catch (error) {
    return fail(error);
  }
}
