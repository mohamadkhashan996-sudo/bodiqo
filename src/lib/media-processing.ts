import type { MediaKind } from "@prisma/client";

export { ACCEPT_BY_PURPOSE } from "@/lib/media-accept";

export const ALLOWED_MIME = new Map<string, MediaKind>([
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

export function normalizeMime(mime: string) {
  return mime.split(";")[0]?.trim().toLowerCase() || mime;
}

export function extFor(mime: string) {
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
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    default:
      return "bin";
  }
}

function startsWith(buf: Buffer, bytes: number[]) {
  return bytes.every((b, i) => buf[i] === b);
}

function isWebp(buf: Buffer) {
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  );
}

function isMp4(buf: Buffer) {
  if (buf.length < 12) return false;
  if (buf.toString("ascii", 4, 8) === "ftyp") return true;
  // Some MP4s have a larger box size before ftyp within first 32 bytes
  for (let i = 0; i + 8 <= Math.min(buf.length, 64); i += 1) {
    if (buf.toString("ascii", i + 4, i + 8) === "ftyp") return true;
  }
  return false;
}

function isWav(buf: Buffer) {
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  );
}

function isOgg(buf: Buffer) {
  return startsWith(buf, [0x4f, 0x67, 0x67, 0x53]); // OggS
}

function isMp3(buf: Buffer) {
  // ID3 tag or MPEG frame sync
  if (startsWith(buf, [0x49, 0x44, 0x33])) return true;
  return buf.length >= 2 && buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0;
}

function isZipContainer(buf: Buffer) {
  // DOCX (and other OOXML) are ZIP
  return startsWith(buf, [0x50, 0x4b, 0x03, 0x04]);
}

function isOleDoc(buf: Buffer) {
  // Legacy .doc OLE compound document
  return startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
}

/**
 * Detect kind/mime from magic bytes. Claimed MIME only used to disambiguate
 * WebM audio vs video and DOC vs DOCX zip.
 */
export function sniffKind(
  buf: Buffer,
  claimedMime: string,
): { kind: MediaKind; mime: string } | null {
  const claimed = normalizeMime(claimedMime);

  if (startsWith(buf, [0xff, 0xd8, 0xff])) {
    return { kind: "IMAGE", mime: "image/jpeg" };
  }
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47])) {
    return { kind: "IMAGE", mime: "image/png" };
  }
  if (isWebp(buf)) {
    return { kind: "IMAGE", mime: "image/webp" };
  }
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) {
    return { kind: "GIF", mime: "image/gif" };
  }
  if (isMp4(buf)) {
    if (claimed.startsWith("audio/")) {
      return { kind: "VOICE", mime: "audio/mp4" };
    }
    return { kind: "VIDEO", mime: "video/mp4" };
  }
  // WebM / Matroska EBML
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) {
    if (claimed.includes("audio")) {
      return { kind: "VOICE", mime: "audio/webm" };
    }
    return { kind: "VIDEO", mime: "video/webm" };
  }
  if (isWav(buf)) {
    return { kind: "VOICE", mime: "audio/wav" };
  }
  if (isOgg(buf)) {
    return { kind: "VOICE", mime: "audio/ogg" };
  }
  if (isMp3(buf) && (claimed === "audio/mpeg" || claimed === "audio/mp3")) {
    return { kind: "VOICE", mime: "audio/mpeg" };
  }
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) {
    return { kind: "DOCUMENT", mime: "application/pdf" };
  }
  if (isOleDoc(buf)) {
    return { kind: "DOCUMENT", mime: "application/msword" };
  }
  if (isZipContainer(buf)) {
    if (
      claimed ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return {
        kind: "DOCUMENT",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
  }
  // Plain text: only when claimed, and buffer is mostly printable ASCII/UTF-8
  if (claimed === "text/plain" && buf.length > 0 && buf.length < 2_000_000) {
    const sample = buf.subarray(0, Math.min(buf.length, 4096));
    let weird = 0;
    for (const b of sample) {
      if (b === 0) return null;
      if (b < 9 || (b > 13 && b < 32)) weird += 1;
    }
    if (weird / sample.length < 0.05) {
      return { kind: "DOCUMENT", mime: "text/plain" };
    }
  }

  // Last resort: allow claimed audio/mpeg if ID3-less frame sync matched poorly
  if (claimed === "audio/mpeg" && isMp3(buf)) {
    return { kind: "VOICE", mime: "audio/mpeg" };
  }

  return null;
}

/** True global cap: never exceed the lower of kind vs storage max. */
export function resolveMaxBytes(opts: {
  kind: MediaKind;
  kindMaxMb: number;
  globalMaxMb: number;
}) {
  const maxMb = Math.min(opts.kindMaxMb, opts.globalMaxMb);
  return Math.max(1, maxMb) * 1024 * 1024;
}

/**
 * Lightweight content hygiene: reject polyglot / embedded executable markers
 * in images and PDFs. Not a full AV scanner — pairs with status PROCESSING when
 * an external scanner is configured.
 */
export function quickContentScan(
  buf: Buffer,
  kind: MediaKind,
): { ok: true } | { ok: false; reason: string } {
  const head = buf.subarray(0, Math.min(buf.length, 512)).toString("latin1");
  const lower = head.toLowerCase();
  if (
    lower.includes("<script") ||
    lower.includes("<?php") ||
    lower.includes("<%")
  ) {
    return { ok: false, reason: "Suspicious embedded script content" };
  }
  if (kind === "IMAGE" || kind === "GIF") {
    const probe = buf.subarray(0, Math.min(buf.length, 8192));
    if (startsWith(probe, [0x7f, 0x45, 0x4c, 0x46])) {
      return { ok: false, reason: "Executable content detected" };
    }
  }
  return { ok: true };
}

export async function optimizeImageBuffer(
  buf: Buffer,
  mime: string,
): Promise<{
  buffer: Buffer;
  mime: string;
  width: number | null;
  height: number | null;
  optimized: boolean;
}> {
  // Skip animated GIF and already-small files
  if (mime === "image/gif" || buf.length < 32_000) {
    return {
      buffer: buf,
      mime,
      width: null,
      height: null,
      optimized: false,
    };
  }

  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(buf, { failOn: "none", animated: false }).rotate();
    const meta = await image.metadata();
    const width = meta.width ?? null;
    const height = meta.height ?? null;
    const maxEdge = 2048;

    let pipeline = image;
    if (width && height && Math.max(width, height) > maxEdge) {
      pipeline = pipeline.resize({
        width: width >= height ? maxEdge : undefined,
        height: height > width ? maxEdge : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Prefer WebP for photos; keep PNG when alpha is present and source was PNG
    if (mime === "image/png" && meta.hasAlpha) {
      const out = await pipeline.png({ compressionLevel: 8 }).toBuffer();
      return {
        buffer: out.length < buf.length ? out : buf,
        mime: "image/png",
        width,
        height,
        optimized: out.length < buf.length,
      };
    }

    const out = await pipeline.webp({ quality: 82 }).toBuffer();
    if (out.length >= buf.length * 0.98) {
      // Keep original if WebP isn't smaller
      const jpeg = await sharp(buf, { failOn: "none" })
        .rotate()
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      if (jpeg.length < buf.length) {
        return {
          buffer: jpeg,
          mime: "image/jpeg",
          width,
          height,
          optimized: true,
        };
      }
      return {
        buffer: buf,
        mime,
        width,
        height,
        optimized: false,
      };
    }

    return {
      buffer: out,
      mime: "image/webp",
      width,
      height,
      optimized: true,
    };
  } catch {
    return {
      buffer: buf,
      mime,
      width: null,
      height: null,
      optimized: false,
    };
  }
}
