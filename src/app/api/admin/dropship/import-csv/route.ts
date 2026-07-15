import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { priceFromCost } from "@/lib/aliexpress";
import { slugify } from "@/lib/catalog-types";

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
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else current += ch;
  }
  result.push(current);
  return result;
}

export async function POST(request: Request) {
  if (!(await assertAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file required" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  const markupDefault = Number(form.get("markupPercent") || 40);
  const publish = String(form.get("publish") || "false") === "true";

  let success = 0;
  let errors = 0;
  const logs: string[] = [];

  const aliexpress = await prisma.supplier.upsert({
    where: { slug: "aliexpress" },
    update: {},
    create: {
      name: "AliExpress",
      slug: "aliexpress",
      website: "https://www.aliexpress.com",
      defaultShippingDays: 15,
      currency: "USD",
    },
  });

  for (const row of rows) {
    try {
      const title = row.title || row.name || row["product title"];
      if (!title) throw new Error("Missing title");

      const supplierUrl =
        row.supplier_url ||
        row["supplier url"] ||
        row.aliexpress_url ||
        row.url ||
        "";
      const cost = Number(row.cost || row.cost_price || row["cost price"] || 0);
      const markup = Number(row.markup || row.markup_percent || markupDefault);
      const price =
        Number(row.price || 0) ||
        (cost > 0 ? priceFromCost(cost, markup) : 0) ||
        29.9;
      const image = row.image || row.image_url || row["image src"] || "";
      const sku =
        row.sku ||
        `DS-${slugify(title).slice(0, 20)}-${Date.now().toString(36).slice(-4)}`;
      const slug =
        row.slug ||
        `${slugify(title)}-${Date.now().toString(36).slice(-5)}`.slice(0, 80);
      const inventory = Number(row.inventory || row.stock || 50);
      const description = row.description || title;
      const supplierSku = row.supplier_sku || row["supplier sku"] || "";
      const variantTitle = row.variant || row.variant_title || "";

      const supplierName = row.supplier || row.vendor || "AliExpress";
      const supplier = supplierName.toLowerCase().includes("ali")
        ? aliexpress
        : await prisma.supplier.upsert({
            where: { slug: slugify(supplierName) || "supplier" },
            update: { name: supplierName },
            create: {
              name: supplierName,
              slug: slugify(supplierName) || `supplier-${Date.now()}`,
            },
          });

      const product = await prisma.product.upsert({
        where: { sku },
        update: {
          title,
          description,
          shortDescription: description.slice(0, 280),
          price,
          costPrice: cost || null,
          markupPercent: markup,
          images: image ? [image] : undefined,
          inventory,
          inStock: inventory > 0,
          supplierId: supplier.id,
          supplierProductUrl: supplierUrl || undefined,
          supplierSku: supplierSku || undefined,
          dropshipEnabled: true,
          enabled: publish,
        },
        create: {
          slug,
          title,
          description,
          shortDescription: description.slice(0, 280),
          price,
          costPrice: cost || null,
          markupPercent: markup,
          currency: "ILS",
          sku,
          images: image ? [image] : [],
          inventory,
          inStock: inventory > 0,
          enabled: publish,
          supplierId: supplier.id,
          supplierProductUrl: supplierUrl || null,
          supplierSku: supplierSku || null,
          dropshipEnabled: true,
        },
      });

      if (variantTitle) {
        const vSku = `${sku}-${slugify(variantTitle).slice(0, 12) || "v"}`;
        await prisma.productVariant.upsert({
          where: { sku: vSku },
          update: {
            title: variantTitle,
            price,
            costPrice: cost || null,
            inventory,
            supplierUrl: supplierUrl || null,
            supplierSku: supplierSku || null,
          },
          create: {
            productId: product.id,
            title: variantTitle,
            sku: vSku,
            price,
            costPrice: cost || null,
            inventory,
            supplierUrl: supplierUrl || null,
            supplierSku: supplierSku || null,
          },
        });
      }

      success++;
    } catch (e) {
      errors++;
      logs.push(e instanceof Error ? e.message : "row failed");
    }
  }

  await prisma.importJob.create({
    data: {
      source: "dropship-csv",
      status: "completed",
      totalRows: rows.length,
      successRows: success,
      errorRows: errors,
      log: logs.slice(0, 40).join("\n"),
    },
  });

  return NextResponse.json({
    ok: true,
    total: rows.length,
    success,
    errors,
    logs: logs.slice(0, 20),
  });
}
