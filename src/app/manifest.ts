import type { MetadataRoute } from "next";

import { site } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.tagline,
    start_url: "/home",
    display: "standalone",
    background_color: "#F4F2EE",
    theme_color: "#178077",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["social", "lifestyle"],
    icons: [
      {
        src: "/brand/app-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/app-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
