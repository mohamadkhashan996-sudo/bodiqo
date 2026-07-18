import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      handle: string | null;
      onboardingDone: boolean;
    } & DefaultSession["user"];
    deviceSessionId?: string;
  }

  interface User {
    role?: string;
    handle?: string | null;
    onboardingDone?: boolean;
    sessionVersion?: number;
    remember?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    handle?: string | null;
    onboardingDone?: boolean;
    image?: string | null;
    sessionVersion?: number;
    sessionKey?: string;
    deviceSessionId?: string;
    remember?: boolean;
  }
}
