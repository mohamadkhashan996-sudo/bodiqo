export type UploadResult = {
  url: string;
  kind: string;
  assetId: string;
  sizeBytes: number;
  mimeType: string;
};

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Upload failed");
  }
  return data as UploadResult;
}
