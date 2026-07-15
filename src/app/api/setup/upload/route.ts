import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadMediaBuffer } from "@/lib/media";
import { isSetupComplete } from "@/lib/setup";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (await isSetupComplete()) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 409 });
  }

  const ip = request.headers.get("x-forwarded-for") || "anon";
  const limited = rateLimit(`setup-upload:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const uploaded = await uploadMediaBuffer(
    bytes,
    file.name,
    file.type || "application/octet-stream",
  );

  const asset = await prisma.mediaAsset.create({
    data: {
      filename: uploaded.filename,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      alt: "Store logo",
    },
  });

  return NextResponse.json({ url: asset.url });
}
