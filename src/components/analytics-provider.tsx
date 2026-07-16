"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;
    const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
    if (provider !== "plausible" || !domain) return;
    if (document.querySelector('script[data-relune-analytics="plausible"]')) return;
    const script = document.createElement("script");
    script.defer = true;
    script.dataset.domain = domain;
    script.dataset.reluneAnalytics = "plausible";
    script.src = "https://plausible.io/js/script.js";
    document.head.appendChild(script);
  }, []);

  return <>{children}</>;
}
