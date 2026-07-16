"use client";

import { SessionProvider } from "next-auth/react";
import { ExperienceProvider } from "@/components/experience-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { ServiceWorkerRegister } from "@/components/pwa-register";
import { GuestProvider } from "@/components/auth/guest-provider";

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
    <SessionProvider>
      <GuestProvider>
        <ExperienceProvider initialLocale={locale} initialTheme={theme}>
          <AnalyticsProvider>
            <ServiceWorkerRegister />
            {children}
          </AnalyticsProvider>
        </ExperienceProvider>
      </GuestProvider>
    </SessionProvider>
  );
}
