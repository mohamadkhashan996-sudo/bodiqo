import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MediaKind } from "@prisma/client";
import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { getSetting } from "@/modules/admin/services/settings";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Map<string, MediaKind>([
  ["image/jpeg", "IMAGE"],
  ["image/png", "IMAGE"],
  ["image/webp", "IMAGE"],
  ["image/gif", "GIF"],
  ["video/mp4", "VIDEO"],
  ["video/webm", "VIDEO"],
  ["audio/mpeg", "VOICE"],
  ["audio/mp4", "VOICE"],
  ["application/pdf", "DOCUMENT"],
]);

function extFor(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
      return "m4a";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "upload", 20);
    const user = await requireUser();
    const storage = (await getSetting<{ maxUploadMb?: number }>("storage")) ?? {};
    const maxBytes = (storage.maxUploadMb ?? 50) * 1024 * 1024;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("File required", 400);
    if (file.size > maxBytes) {
      throw new AppError("File exceeds upload limit", 413);
    }

    const kind = ALLOWED.get(file.type);
    if (!kind) throw new AppError("Unsupported file type", 415);

    const ext = extFor(file.type);
    const name = `${randomUUID()}.${ext}`;
    const relative = path.join("uploads", user.id, name);
    const absolute = path.join(process.cwd(), "public", relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, Buffer.from(await file.arrayBuffer()));

    const url = `/${relative.replace(/\\/g, "/")}`;
    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId: user.id,
        kind,
        originalUrl: url,
        mimeType: file.type,
        sizeBytes: file.size,
        meta: { originalName: file.name.slice(0, 180) },
      },
    });

    return ok({
      url,
      kind,
      assetId: asset.id,
      sizeBytes: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    return fail(error);
  }
}
