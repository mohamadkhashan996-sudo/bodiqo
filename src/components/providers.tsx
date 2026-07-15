"use client";

import { SessionProvider } from "next-auth/react";
import { PreferencesProvider } from "@/components/preferences-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </SessionProvider>
  );
}
