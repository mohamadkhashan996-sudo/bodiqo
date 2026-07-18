"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

import { trackPageView } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  const enablePlausible = provider === "plausible" && Boolean(domain);

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname);
  }, [pathname]);

  return (
    <>
      {enablePlausible ? (
        <Script
          defer
          data-domain={domain}
          data-relune-analytics="plausible"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      ) : null}
      {children}
    </>
  );
}
