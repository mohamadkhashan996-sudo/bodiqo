import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

async function targetId(handle: string) {
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true },
  });
  if (!user) throw new AppError("User not found", 404);
  return user.id;
}
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    await guardApiAbuse(_request, "safety:restrict:handle:post");
    const user = await requireUser();
    const target = await targetId((await params).handle);
    if (user.id === target)
      throw new AppError("You cannot restrict yourself", 400);
    return ok({
      restrict: await prisma.restrict.upsert({
        where: {
          restrictorId_restrictedId: {
            restrictorId: user.id,
            restrictedId: target,
          },
        },
        create: { restrictorId: user.id, restrictedId: target },
        update: {},
      }),
    });
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    await guardApiAbuse(_request, "safety:restrict:handle:delete");
    const user = await requireUser();
    const target = await targetId((await params).handle);
    return ok(
      await prisma.restrict.deleteMany({
        where: { restrictorId: user.id, restrictedId: target },
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
