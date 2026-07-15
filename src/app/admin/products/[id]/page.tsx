"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Category = { id: string; name: string };
type Supplier = { id: string; name: string };
type Variant = {
  id: string;
  title: string;
  sku: string;
  price: number;
  inventory: number;
  supplierSku: string | null;
};
type ProductForm = {
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: string;
  compareAt: string;
  costPrice: string;
  markupPercent: string;
  sku: string;
  vendor: string;
  images: string;
  videoUrl: string;
  inventory: string;
  featured: boolean;
  enabled: boolean;
  inStock: boolean;
  dropshipEnabled: boolean;
  categoryId: string;
  supplierId: string;
  supplierProductUrl: string;
  supplierProductId: string;
  supplierSku: string;
  seoTitle: string;
  seoDescription: string;
};

const empty: ProductForm = {
  title: "",
  slug: "",
  description: "",
  shortDescription: "",
  price: "",
  compareAt: "",
  costPrice: "",
  markupPercent: "40",
  sku: "",
  vendor: "BODIQO",
  images: "",
  videoUrl: "",
  inventory: "50",
  featured: false,
  enabled: true,
  inStock: true,
  dropshipEnabled: true,
  categoryId: "",
  supplierId: "",
  supplierProductUrl: "",
  supplierProductId: "",
  supplierSku: "",
  seoTitle: "",
  seoDescription: "",
};

export default function ProductEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "new";
  const [form, setForm] = useState<ProductForm>(empty);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantTitle, setVariantTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/suppliers").then((r) => r.json()),
    ])
      .then(([c, s]) => {
        setCategories(c.categories || []);
        setSuppliers(s.suppliers || []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id || id === "new") return;
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.product;
        if (!p) return;
        setForm({
          title: p.title,
          slug: p.slug,
          description: p.description,
          shortDescription: p.shortDescription,
          price: String(p.price),
          compareAt: p.compareAt ? String(p.compareAt) : "",
          costPrice: p.costPrice != null ? String(p.costPrice) : "",
          markupPercent:
            p.markupPercent != null ? String(p.markupPercent) : "40",
          sku: p.sku,
          vendor: p.vendor,
          images: (Array.isArray(p.images) ? (p.images as string[]) : []).join(
            "\n",
          ),
          videoUrl: p.videoUrl || "",
          inventory: String(p.inventory),
          featured: p.featured,
          enabled: p.enabled,
          inStock: p.inStock,
          dropshipEnabled: p.dropshipEnabled !== false,
          categoryId: p.categoryId || "",
          supplierId: p.supplierId || "",
          supplierProductUrl: p.supplierProductUrl || "",
          supplierProductId: p.supplierProductId || "",
          supplierSku: p.supplierSku || "",
          seoTitle: p.seoTitle || "",
          seoDescription: p.seoDescription || "",
        });
        setVariants(
          (p.variants || []).map(
            (v: {
              id: string;
              title: string;
              sku: string;
              price: number | string;
              inventory: number;
              supplierSku: string | null;
            }) => ({
              ...v,
              price: Number(v.price),
            }),
          ),
        );
      });
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      slug: form.slug || undefined,
      description: form.description,
      shortDescription: form.shortDescription,
      price: Number(form.price),
      compareAt: form.compareAt ? Number(form.compareAt) : null,
      costPrice: form.costPrice ? Number(form.costPrice) : null,
      markupPercent: Number(form.markupPercent) || 40,
      sku: form.sku,
      vendor: form.vendor,
      images: form.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      videoUrl: form.videoUrl || null,
      inventory: Number(form.inventory),
      featured: form.featured,
      enabled: form.enabled,
      inStock: form.inStock,
      dropshipEnabled: form.dropshipEnabled,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      supplierProductUrl: form.supplierProductUrl || null,
      supplierProductId: form.supplierProductId || null,
      supplierSku: form.supplierSku || null,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
    };

    const isNew = id === "new";
    const res = await fetch(
      isNew ? "/api/admin/products" : `/api/admin/products/${id}`,
      {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  async function onDelete() {
    if (id === "new") return;
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    router.push("/admin/products");
    router.refresh();
  }

  function set<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          {id !== "new" ? "Edit product" : "New product"}
        </h1>
        <Link href="/admin/products" className="text-sm text-[#f3efe6]/50">
          Back
        </Link>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <Input
          label="Title"
          value={form.title}
          onChange={(v) => set("title", v)}
          required
        />
        <Input
          label="Slug"
          value={form.slug}
          onChange={(v) => set("slug", v)}
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={(v) => set("sku", v)}
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Price"
            type="number"
            value={form.price}
            onChange={(v) => set("price", v)}
            required
          />
          <Input
            label="Compare at"
            type="number"
            value={form.compareAt}
            onChange={(v) => set("compareAt", v)}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Input
            label="Cost price"
            type="number"
            value={form.costPrice}
            onChange={(v) => set("costPrice", v)}
          />
          <Input
            label="Markup %"
            type="number"
            value={form.markupPercent}
            onChange={(v) => set("markupPercent", v)}
          />
          <Input
            label="Inventory"
            type="number"
            value={form.inventory}
            onChange={(v) => set("inventory", v)}
          />
        </div>
        <label className="block">
          <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
            Category
          </span>
          <select
            value={form.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl border border-white/10 p-4">
          <p className="text-[11px] tracking-[0.16em] text-[#d4b483] uppercase">
            Dropshipping / supplier
          </p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
                Supplier
              </span>
              <select
                value={form.supplierId}
                onChange={(e) => set("supplierId", e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
              >
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Supplier product URL"
              value={form.supplierProductUrl}
              onChange={(v) => set("supplierProductUrl", v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Supplier product ID"
                value={form.supplierProductId}
                onChange={(v) => set("supplierProductId", v)}
              />
              <Input
                label="Supplier SKU"
                value={form.supplierSku}
                onChange={(v) => set("supplierSku", v)}
              />
            </div>
            <Check
              label="Dropship enabled"
              checked={form.dropshipEnabled}
              onChange={(v) => set("dropshipEnabled", v)}
            />
          </div>
        </div>
        <Text
          label="Short description"
          value={form.shortDescription}
          onChange={(v) => set("shortDescription", v)}
        />
        <Text
          label="Description"
          value={form.description}
          onChange={(v) => set("description", v)}
          rows={6}
        />
        <Text
          label="Image URLs (one per line)"
          value={form.images}
          onChange={(v) => set("images", v)}
          rows={4}
        />
        <Input
          label="Video URL"
          value={form.videoUrl}
          onChange={(v) => set("videoUrl", v)}
        />
        <Input
          label="SEO title"
          value={form.seoTitle}
          onChange={(v) => set("seoTitle", v)}
        />
        <Text
          label="SEO description"
          value={form.seoDescription}
          onChange={(v) => set("seoDescription", v)}
        />
        <div className="flex flex-wrap gap-5">
          <Check
            label="Enabled"
            checked={form.enabled}
            onChange={(v) => set("enabled", v)}
          />
          <Check
            label="In stock"
            checked={form.inStock}
            onChange={(v) => set("inStock", v)}
          />
          <Check
            label="Featured"
            checked={form.featured}
            onChange={(v) => set("featured", v)}
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#d4b483] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save product"}
          </button>
          {id !== "new" ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full border border-red-400/30 px-6 py-3 text-[11px] tracking-[0.16em] text-red-300 uppercase"
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>

      {id !== "new" ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6">
          <h2 className="text-[11px] tracking-[0.16em] text-[#d4b483] uppercase">
            Variants
          </h2>
          <ul className="divide-y divide-white/10 text-sm">
            {variants.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p>{v.title}</p>
                  <p className="text-xs text-[#f3efe6]/40">
                    {v.sku} · stock {v.inventory}
                    {v.supplierSku ? ` · ${v.supplierSku}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(
                      `/api/admin/products/${id}/variants?variantId=${v.id}`,
                      { method: "DELETE" },
                    );
                    setVariants((prev) => prev.filter((x) => x.id !== v.id));
                  }}
                  className="text-xs text-red-300"
                >
                  Remove
                </button>
              </li>
            ))}
            {variants.length === 0 ? (
              <li className="py-3 text-[#f3efe6]/45">No variants yet.</li>
            ) : null}
          </ul>
          <div className="flex gap-3">
            <input
              value={variantTitle}
              onChange={(e) => setVariantTitle(e.target.value)}
              placeholder="Variant title (e.g. Black / 1m)"
              className="flex-1 rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                if (!variantTitle.trim()) return;
                const res = await fetch(`/api/admin/products/${id}/variants`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: variantTitle,
                    price: Number(form.price) || 1,
                    costPrice: form.costPrice
                      ? Number(form.costPrice)
                      : undefined,
                    inventory: Number(form.inventory) || 0,
                    supplierUrl: form.supplierProductUrl || undefined,
                    supplierSku: form.supplierSku || undefined,
                  }),
                });
                const data = await res.json();
                if (res.ok && data.variant) {
                  setVariants((prev) => [
                    ...prev,
                    {
                      id: data.variant.id,
                      title: data.variant.title,
                      sku: data.variant.sku,
                      price: Number(data.variant.price),
                      inventory: data.variant.inventory,
                      supplierSku: data.variant.supplierSku,
                    },
                  ]);
                  setVariantTitle("");
                }
              }}
              className="rounded-full bg-[#d4b483] px-5 py-2.5 text-[11px] font-semibold tracking-[0.14em] text-[#0b0b0b] uppercase"
            >
              Add
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        step={type === "number" ? "any" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm outline-none focus:border-[#d4b483]"
      />
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm outline-none focus:border-[#d4b483]"
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[#d4b483]"
      />
      {label}
    </label>
  );
}
