"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

type MediaUploaderProps = {
  label?: string;
  accept?: string;
  multiple?: boolean;
  onUploaded: (urls: string[]) => void;
  className?: string;
};

export function MediaUploader({
  label = "Drag & drop images or videos",
  accept = "image/*,video/*",
  multiple = true,
  onUploaded,
  className,
}: MediaUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setUploading(true);
      setError(null);
      const urls: string[] = [];
      try {
        for (const file of list) {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/admin/media", {
            method: "POST",
            body: form,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Upload failed");
          urls.push(data.asset.url);
        }
        onUploaded(urls);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border border-dashed px-6 py-10 text-center transition",
          dragging
            ? "border-[#4a8cff] bg-[#4a8cff]/10"
            : "border-white/15 bg-[#0a0a0a]",
        )}
      >
        <p className="text-sm text-[#f3efe6]/70">{label}</p>
        <p className="mt-1 text-xs text-[#f3efe6]/40">
          Images & videos · Shopify-style media upload
        </p>
        <label className="mt-4 inline-block cursor-pointer rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase">
          {uploading ? "Uploading…" : "Choose files"}
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
