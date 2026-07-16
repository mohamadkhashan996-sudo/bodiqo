import { site } from "@/config/site";

export function absoluteUrl(path: string) {
  const base = site.url.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
