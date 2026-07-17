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
  ["audio/webm", "VOICE"],
  ["audio/ogg", "VOICE"],
  ["audio/wav", "VOICE"],
  ["application/pdf", "DOCUMENT"],
  ["text/plain", "DOCUMENT"],
  ["application/msword", "DOCUMENT"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "DOCUMENT",
  ],
]);

const MAGIC: Array<{ kind: MediaKind; mime: string; bytes: number[] }> = [
  { kind: "IMAGE", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { kind: "IMAGE", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { kind: "IMAGE", mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  { kind: "GIF", mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { kind: "VIDEO", mime: "video/mp4", bytes: [0x00, 0x00, 0x00] }, // ftyp checked below
  { kind: "DOCUMENT", mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

function normalizeMime(mime: string) {
  return mime.split(";")[0]?.trim().toLowerCase() || mime;
}

function extFor(mime: string) {
  switch (normalizeMime(mime)) {
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
    case "audio/webm":
      return "webm";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
      return "wav";
    case "application/pdf":
      return "pdf";
    case "text/plain":
      return "txt";
    default:
      return "bin";
  }
}

function sniffKind(buf: Buffer, claimedMime: string): { kind: MediaKind; mime: string } | null {
  const claimed = ALLOWED.get(normalizeMime(claimedMime));
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    return { kind: "VIDEO", mime: "video/mp4" };
  }
  for (const row of MAGIC) {
    if (row.bytes.every((b, i) => buf[i] === b)) {
      return { kind: row.kind, mime: row.mime };
    }
  }
  // Allow claimed audio/webm/text when magic is ambiguous
  if (claimed && (claimed === "VOICE" || claimed === "DOCUMENT" || claimedMime.includes("webm"))) {
    return { kind: claimed, mime: normalizeMime(claimedMime) };
  }
  return claimed ? { kind: claimed, mime: normalizeMime(claimedMime) } : null;
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "upload", 20);
    const user = await requireUser();
    const storage = (await getSetting<{ maxUploadMb?: number }>("storage")) ?? {};
    const maxBytes = (storage.maxUploadMb ?? 50) * 1024 * 1024;

    const form = await request.formData();
    const file = form.get("file");
    const isPrivate = String(form.get("private") || "") === "1";
    if (!(file instanceof File)) throw new AppError("File required", 400);
    if (file.size > maxBytes) {
      throw new AppError("File exceeds upload limit", 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffKind(buffer, file.type || "");
    if (!sniffed || !ALLOWED.has(sniffed.mime)) {
      throw new AppError("Unsupported file type", 415);
    }

    const ext = extFor(sniffed.mime);
    const name = `${randomUUID()}.${ext}`;
    const relative = path.join("uploads", user.id, name);

    if (isPrivate) {
      const absolute = path.join(process.cwd(), "storage", "private", relative);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, buffer);
    } else {
      const absolute = path.join(process.cwd(), "public", relative);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, buffer);
    }

    const url = isPrivate
      ? `/api/media/${user.id}/${name}`
      : `/${relative.replace(/\\/g, "/")}`;

    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId: user.id,
        kind: sniffed.kind,
        originalUrl: url,
        mimeType: sniffed.mime,
        sizeBytes: file.size,
        meta: {
          originalName: file.name.slice(0, 180),
          private: isPrivate,
        },
      },
    });

    return ok({
      url,
      kind:
        sniffed.kind === "VOICE"
          ? "AUDIO"
          : sniffed.kind === "DOCUMENT"
            ? "FILE"
            : sniffed.kind,
      assetId: asset.id,
      sizeBytes: file.size,
      mimeType: sniffed.mime,
    });
  } catch (error) {
    return fail(error);
  }
}
