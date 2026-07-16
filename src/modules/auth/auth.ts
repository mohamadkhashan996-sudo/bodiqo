import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { trackLogin, upsertDeviceSession } from "@/modules/auth/session-track";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  totpCode: z.string().trim().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })] : []),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET })] : []),
    ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
      ? [Apple({ clientId: process.env.AUTH_APPLE_ID, clientSecret: process.env.AUTH_APPLE_SECRET })] : []),
    ...((process.env.AUTH_MICROSOFT_ENTRA_ID || process.env.AUTH_MICROSOFT_ID) && process.env.AUTH_MICROSOFT_ENTRA_SECRET
      ? [MicrosoftEntraID({ clientId: process.env.AUTH_MICROSOFT_ENTRA_ID || process.env.AUTH_MICROSOFT_ID!, clientSecret: process.env.AUTH_MICROSOFT_ENTRA_SECRET })] : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "Authenticator code", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const key = `auth:${parsed.data.email.toLowerCase()}`;
        const limited = rateLimit(key, 8, 60_000);
        if (!limited.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash || user.status !== "ACTIVE" || !user.emailVerified) {
          if (user) await trackLogin({ userId: user.id, success: false, provider: "credentials" });
          return null;
        }

        const ok = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!ok) {
          await trackLogin({ userId: user.id, success: false, provider: "credentials" });
          return null;
        }
        if (user.twoFactorEnabled) {
          if (!parsed.data.totpCode) {
            await trackLogin({ userId: user.id, success: false, provider: "credentials" });
            return null;
          }
          const { verify } = await import("otplib");
          if (!user.twoFactorSecret || !(await verify({ token: parsed.data.totpCode, secret: user.twoFactorSecret })).valid) {
            await trackLogin({ userId: user.id, success: false, provider: "credentials" });
            return null;
          }
        }
        await trackLogin({ userId: user.id, success: true, provider: "credentials" });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          handle: user.handle,
          onboardingDone: user.onboardingDone,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.handle = (user as { handle?: string | null }).handle ?? null;
        token.onboardingDone = (user as { onboardingDone?: boolean }).onboardingDone ?? false;
        token.image = user.image;
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = (token.role as string) || "USER";
        session.user.handle = (token.handle as string | null) ?? null;
        session.user.onboardingDone = Boolean(token.onboardingDone);
        session.user.image = (token.image as string | null) ?? session.user.image;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id) return;
      const sessionKey = `${account?.provider ?? "credentials"}:${account?.providerAccountId ?? user.id}`;
      await Promise.all([
        upsertDeviceSession({ userId: user.id, sessionKey, label: account?.provider ?? "credentials" }),
        account?.provider === "credentials" ? Promise.resolve() : trackLogin({ userId: user.id, success: true, provider: account?.provider }),
      ]);
    },
  },
});
