import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/modules/auth";
import { AppError, toErrorResponse } from "@/lib/errors";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id)
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return session.user;
}
export async function body<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AppError("Invalid JSON", 400);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new AppError("Invalid request", 400, "VALIDATION_ERROR");
  return parsed.data;
}
export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
export function fail(error: unknown) {
  const result = toErrorResponse(error);
  return NextResponse.json(result.body, { status: result.status });
}
export function paramsId(context: { params: Promise<Record<string, string>> }) {
  return context.params;
}
