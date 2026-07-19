"use client";

import { SessionProvider } from "next-auth/react";

import { OfficialManageBanner } from "@/components/platform/official-manage-banner";

/** Client host so return signIn works outside AppProviders shells. */
export function OfficialManageBannerHost() {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <OfficialManageBanner />
    </SessionProvider>
  );
}
