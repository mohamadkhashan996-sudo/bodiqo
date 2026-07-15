/**
 * Media adapter — local disk by default, optional Cloudinary when configured.
 * Never required for daily ops; upload from admin Media Library.
 */

export type UploadedMedia = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export async function uploadMediaBuffer(
  bytes: Buffer,
  filename: string,
  mimeType: string,
): Promise<UploadedMedia> {
  if (cloudinaryConfigured()) {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
    const key = process.env.CLOUDINARY_API_KEY!;
    const secret = process.env.CLOUDINARY_API_SECRET!;
    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = await import("crypto");
    const toSign = `timestamp=${timestamp}${secret}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");
    const form = new FormData();
    form.append("file", `data:${mimeType};base64,${bytes.toString("base64")}`);
    form.append("api_key", key);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/auto/upload`,
      { method: "POST", body: form },
    );
    if (!res.ok) {
      throw new Error("Cloudinary upload failed");
    }
    const data = (await res.json()) as { secure_url: string };
    return {
      url: data.secure_url,
      filename,
      mimeType,
      size: bytes.length,
    };
  }

  const { writeFile, mkdir } = await import("fs/promises");
  const path = await import("path");
  const { slugify } = await import("@/lib/catalog-types");
  const ext = path.extname(filename) || ".bin";
  const safe = `${Date.now()}-${slugify(filename.replace(ext, "")) || "file"}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safe), bytes);
  return {
    url: `/uploads/${safe}`,
    filename,
    mimeType,
    size: bytes.length,
  };
}
