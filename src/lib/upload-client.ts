export type UploadResult = {
  url: string;
  kind: string;
  assetId: string;
  sizeBytes: number;
  mimeType: string;
  thumbUrl?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  optimized?: boolean;
};

export type UploadOptions = {
  private?: boolean;
  purpose?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  thumbUrl?: string;
  /** 0–100 progress callback (XHR upload). */
  onProgress?: (percent: number) => void;
  /** AbortSignal to cancel the in-flight upload. */
  signal?: AbortSignal;
  /** Extra attempts after the first failure (default 2 → 3 total). */
  retries?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildForm(
  file: File,
  options?: Omit<UploadOptions, "onProgress" | "signal" | "retries">,
) {
  const form = new FormData();
  form.append("file", file);
  if (options?.private) form.append("private", "1");
  if (options?.purpose) form.append("purpose", options.purpose);
  if (options?.width) form.append("width", String(Math.round(options.width)));
  if (options?.height)
    form.append("height", String(Math.round(options.height)));
  if (options?.durationMs) {
    form.append("durationMs", String(Math.round(options.durationMs)));
  }
  if (options?.thumbUrl) form.append("thumbUrl", options.thumbUrl);
  return form;
}

function xhrUpload(
  form: FormData,
  options?: Pick<UploadOptions, "onProgress" | "signal">,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.responseType = "json";

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    if (options?.signal) {
      if (options.signal.aborted) {
        onAbort();
        return;
      }
      options.signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (!options?.onProgress || !event.lengthComputable) return;
      options.onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      options?.signal?.removeEventListener("abort", onAbort);
      const data = xhr.response ?? {};
      if (xhr.status >= 200 && xhr.status < 300) {
        options?.onProgress?.(100);
        resolve(data as UploadResult);
        return;
      }
      reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };

    xhr.onerror = () => {
      options?.signal?.removeEventListener("abort", onAbort);
      reject(new Error("Network error during upload"));
    };

    xhr.onabort = () => {
      options?.signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Upload cancelled", "AbortError"));
    };

    xhr.send(form);
  });
}

/**
 * Upload a file with progress, cancel, and retry support.
 * Falls back to fetch when XMLHttpRequest is unavailable (SSR/tests).
 */
export async function uploadFile(
  file: File,
  options?: UploadOptions,
): Promise<UploadResult> {
  const retries = Math.max(0, options?.retries ?? 2);
  const formFields = {
    private: options?.private,
    purpose: options?.purpose,
    width: options?.width,
    height: options?.height,
    durationMs: options?.durationMs,
    thumbUrl: options?.thumbUrl,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (options?.signal?.aborted) {
      throw new DOMException("Upload cancelled", "AbortError");
    }
    try {
      if (typeof XMLHttpRequest !== "undefined") {
        return await xhrUpload(buildForm(file, formFields), {
          onProgress: options?.onProgress,
          signal: options?.signal,
        });
      }
      const res = await fetch("/api/upload", {
        method: "POST",
        body: buildForm(file, formFields),
        signal: options?.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      options?.onProgress?.(100);
      return data as UploadResult;
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      if (attempt >= retries) break;
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Upload failed");
}
