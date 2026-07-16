import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/sign-in`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/sign-up`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/communities`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ];
}
