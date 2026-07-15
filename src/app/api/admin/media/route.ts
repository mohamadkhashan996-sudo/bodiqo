import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { uploadMediaBuffer } from "@/lib/media";

export async function POST(request: Request) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
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
    },
  });

  return NextResponse.json({ asset });
}

export async function GET() {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ assets });
}
