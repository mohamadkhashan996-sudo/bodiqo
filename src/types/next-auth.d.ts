import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      handle: string | null;
      onboardingDone: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    handle?: string | null;
    onboardingDone?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    handle?: string | null;
    onboardingDone?: boolean;
    image?: string | null;
  }
}
