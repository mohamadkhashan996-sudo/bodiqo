import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";

async function assertAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? session : null;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function upsertFromRow(row: Record<string, string>) {
  const title =
    row.title || row.name || row["product title"] || row.handle || "Untitled";
  const handle = row.handle || row.slug || slugify(title);
  const sku = row.sku || row["variant sku"] || `SKU-${handle.slice(0, 20)}`;
  const price = Number(
    row.price || row["variant price"] || row["variant price"] || 0,
  );
  const compareAt = Number(
    row["compare at"] || row["compare-at price"] || row.compare_at_price || 0,
  );
  const image =
    row.image ||
    row["image src"] ||
    row.image_src ||
    row["featured image"] ||
    "";
  const categoryName =
    row.category || row["product type"] || row.product_type || "Imported";
  const description =
    row.description || row["body (html)"] || row.body_html || title;
  const inventory = Number(row.inventory || row["variant inventory qty"] || 50);

  const catSlug = slugify(categoryName);
  const category = await prisma.category.upsert({
    where: { slug: catSlug },
    update: { name: categoryName },
    create: { name: categoryName, slug: catSlug },
  });

  await prisma.product.upsert({
    where: { slug: handle.slice(0, 80) },
    update: {
      title,
      description: description.replace(/<[^>]+>/g, " ").slice(0, 8000),
      shortDescription: description.replace(/<[^>]+>/g, " ").slice(0, 280),
      price: price || 1,
      compareAt: compareAt > price ? compareAt : null,
      sku,
      images: image ? [image] : [],
      inventory: Number.isFinite(inventory) ? inventory : 50,
      inStock: true,
      enabled: true,
      categoryId: category.id,
      vendor: row.vendor || "BODIQO",
    },
    create: {
      slug: handle.slice(0, 80),
      title,
      description: description.replace(/<[^>]+>/g, " ").slice(0, 8000),
      shortDescription: description.replace(/<[^>]+>/g, " ").slice(0, 280),
      price: price || 1,
      compareAt: compareAt > price ? compareAt : null,
      sku,
      images: image ? [image] : [],
      inventory: Number.isFinite(inventory) ? inventory : 50,
      inStock: true,
      enabled: true,
      categoryId: category.id,
      vendor: row.vendor || "BODIQO",
    },
  });
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  const job = await prisma.importJob.create({
    data: { source: "upload", status: "running" },
  });

  try {
    let rows: Record<string, string>[] = [];
    let source = "csv";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const type = String(form.get("type") || "csv");
      source = type;
      if (!(file instanceof File)) {
        throw new Error("No file provided");
      }
      const text = await file.text();
      if (type === "shopify-json" || file.name.endsWith(".json")) {
        const json = JSON.parse(text);
        const products = json.products || json;
        rows = (Array.isArray(products) ? products : []).map(
          (p: {
            title?: string;
            handle?: string;
            body_html?: string;
            vendor?: string;
            product_type?: string;
            variants?: {
              price?: string;
              sku?: string;
              compare_at_price?: string;
            }[];
            images?: { src?: string }[];
          }) => ({
            title: p.title || "",
            handle: p.handle || "",
            description: p.body_html || "",
            vendor: p.vendor || "BODIQO",
            category: p.product_type || "Imported",
            price: p.variants?.[0]?.price || "0",
            compare_at_price: p.variants?.[0]?.compare_at_price || "",
            sku: p.variants?.[0]?.sku || "",
            image: p.images?.[0]?.src || "",
          }),
        );
      } else {
        rows = parseCsv(text);
      }
    } else {
      const body = await request.json();
      source = body.source || "json";
      if (body.products && Array.isArray(body.products)) {
        rows = body.products;
      } else if (typeof body.csv === "string") {
        rows = parseCsv(body.csv);
      }
    }

    let success = 0;
    let errors = 0;
    const logs: string[] = [];

    for (const row of rows) {
      try {
        await upsertFromRow(row);
        success++;
      } catch (e) {
        errors++;
        logs.push(e instanceof Error ? e.message : "row failed");
      }
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        source,
        status: "completed",
        totalRows: rows.length,
        successRows: success,
        errorRows: errors,
        log: logs.slice(0, 50).join("\n"),
      },
    });

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      total: rows.length,
      success,
      errors,
    });
  } catch (error) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        log: error instanceof Error ? error.message : "Import failed",
      },
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 400 },
    );
  }
}
