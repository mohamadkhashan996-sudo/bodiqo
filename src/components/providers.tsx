"use client";

import { SessionProvider } from "next-auth/react";

import { AnalyticsProvider } from "@/components/analytics-provider";
import { GuestProvider } from "@/components/auth/guest-provider";
import { ExperienceProvider } from "@/components/experience-provider";
import { WebVitalsReporter } from "@/components/observability/web-vitals-reporter";
import { ServiceWorkerRegister } from "@/components/pwa-register";

/**
 * Root providers — kept light for marketing/static routes.
 * Session + guest gate live in {@link AppProviders} (app/auth/admin shells).
 */
export function Providers({
  children,
  locale,
  theme,
}: {
  children: React.ReactNode;
  locale?: string;
  theme?: "LIGHT" | "DARK" | "SYSTEM";
}) {
  return (
    <ExperienceProvider initialLocale={locale} initialTheme={theme}>
      <AnalyticsProvider>
        <WebVitalsReporter />
        {children}
      </AnalyticsProvider>
    </ExperienceProvider>
  );
}

/** Authenticated / guest-browsable shells that need next-auth + auth gate. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <GuestProvider>
        <ServiceWorkerRegister />
        {children}
      </GuestProvider>
    </SessionProvider>
  );
}
