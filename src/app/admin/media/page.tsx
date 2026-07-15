"use client";

import { FormEvent, useEffect, useState } from "react";

type Asset = { id: string; url: string; filename: string };

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/media");
    const data = await res.json();
    setAssets(data.assets || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/media", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Upload failed");
      return;
    }
    setMessage(`Uploaded: ${data.asset.url}`);
    (e.target as HTMLFormElement).reset();
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Media
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Upload images and videos for products and banners.
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <input
          name="file"
          type="file"
          required
          accept="image/*,video/*"
          className="text-sm"
        />
        <button
          type="submit"
          className="mt-4 rounded-full bg-[#d4b483] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
        >
          Upload
        </button>
        {message ? (
          <p className="mt-3 text-sm text-[#d4b483]">{message}</p>
        ) : null}
      </form>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {assets.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-white/10 p-3 text-xs"
          >
            <p className="truncate text-[#f3efe6]/80">{a.filename}</p>
            <p className="mt-1 break-all text-[#d4b483]">{a.url}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
