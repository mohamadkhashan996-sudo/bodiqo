/**
 * Client-side image compression / resize before upload.
 * Reduces bytes and gives a preview blob URL.
 */

export type CompressImageOptions = {
  maxEdge?: number;
  quality?: number;
  /** Prefer webp when supported; falls back to jpeg. */
  preferWebp?: boolean;
};

export type CompressedImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not compress image"));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

/**
 * Resize + recompress a raster image. GIFs are returned unchanged (animation).
 */
export async function compressImageFile(
  file: File,
  options?: CompressImageOptions,
): Promise<CompressedImage> {
  const maxEdge = options?.maxEdge ?? 2048;
  const quality = options?.quality ?? 0.82;
  const preferWebp = options?.preferWebp !== false;

  if (file.type === "image/gif") {
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      previewUrl,
      width: 0,
      height: 0,
      originalBytes: file.size,
      compressedBytes: file.size,
    };
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image file");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const tryWebp =
    preferWebp &&
    typeof document !== "undefined" &&
    document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");

  let blob = await canvasToBlob(
    canvas,
    tryWebp ? "image/webp" : "image/jpeg",
    quality,
  );
  // Keep original if compression grew the file
  if (blob.size >= file.size && scale >= 1) {
    blob = file;
  }

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const out = new File(
    [blob],
    file.name.replace(/\.[^.]+$/, "") + `.${ext}`,
    { type: blob.type, lastModified: Date.now() },
  );
  const previewUrl = URL.createObjectURL(out);

  return {
    file: out,
    previewUrl,
    width,
    height,
    originalBytes: file.size,
    compressedBytes: out.size,
  };
}

export function revokePreviewUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}
