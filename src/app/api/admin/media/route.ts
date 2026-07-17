import { z } from "zod";
import { MediaKind, MediaStatus } from "@prisma/client";
import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import { AppError } from "@/lib/errors";
import {
  getStorageStats,
  listMediaAssets,
  registerMediaAsset,
  softDeleteMedia,
} from "@/modules/admin/services";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:media");
    await requireStaff("media:read");
    const { searchParams } = new URL(request.url);
    if (searchParams.get("stats") === "1") {
      return ok(await getStorageStats());
    }
    return ok({
      assets: await listMediaAssets({
        kind: (searchParams.get("kind") as MediaKind) || undefined,
        status: (searchParams.get("status") as MediaStatus) || undefined,
        take: Number(searchParams.get("take") ?? 40),
      }),
      stats: await getStorageStats(),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:media:write", 30);
    const staff = await requireStaff("media:write");
    const data = await body(
      request,
      z.object({
        action: z.enum(["register", "delete"]),
        id: z.string().optional(),
        kind: z.nativeEnum(MediaKind).optional(),
        originalUrl: z.string().url().optional(),
        mimeType: z.string().optional(),
        sizeBytes: z.number().int().nonnegative().optional(),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
        durationMs: z.number().int().optional(),
      }),
    );
    if (data.action === "delete") {
      if (!data.id) throw new AppError("id required", 400);
      return ok(await softDeleteMedia(staff.id, data.id));
    }
    if (!data.kind || !data.originalUrl) {
      throw new AppError("kind and originalUrl required", 400);
    }
    return ok(
      await registerMediaAsset(staff.id, {
        kind: data.kind,
        originalUrl: data.originalUrl,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        width: data.width,
        height: data.height,
        durationMs: data.durationMs,
      }),
      201,
    );
  } catch (e) {
    return fail(e);
  }
}
