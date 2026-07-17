export type UploadResult = {
  url: string;
  kind: string;
  assetId: string;
  sizeBytes: number;
  mimeType: string;
};

export async function uploadFile(
  file: File,
  options?: { private?: boolean },
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (options?.private) form.append("private", "1");
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Upload failed");
  }
  return data as UploadResult;
}
