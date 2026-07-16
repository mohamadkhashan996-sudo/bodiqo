"use client";

import { SessionProvider } from "next-auth/react";
import { ExperienceProvider } from "@/components/experience-provider";

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
      <ExperienceProvider initialLocale={locale} initialTheme={theme}>
        {children}
      </ExperienceProvider>
    </SessionProvider>
  );
}
