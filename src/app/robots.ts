import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/sign-in", "/sign-up"],
        disallow: [
          "/api/",
          "/admin/",
          "/settings/",
          "/messages/",
          "/notifications/",
          "/onboarding/",
          "/home/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
