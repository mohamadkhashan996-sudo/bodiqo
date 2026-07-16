import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { trackLogin, upsertDeviceSession } from "@/modules/auth/session-track";
import { createPendingOAuthLink } from "@/modules/auth/account-link";
import { isProviderEnabled } from "@/modules/auth/provider-settings";
import { providerEnvReady, type OAuthProviderId } from "@/modules/auth/providers";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  totpCode: z.string().trim().optional(),
  remember: z.string().optional(),
});

function buildOAuthProviders() {
  const list = [];
  if (providerEnvReady("google")) {
    list.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (providerEnvReady("apple")) {
    list.push(
      Apple({
        clientId: process.env.AUTH_APPLE_ID!,
        clientSecret: process.env.AUTH_APPLE_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (providerEnvReady("facebook")) {
    list.push(
      Facebook({
        clientId: process.env.AUTH_FACEBOOK_ID!,
        clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (providerEnvReady("twitter")) {
    list.push(
      Twitter({
        clientId: process.env.AUTH_TWITTER_ID || process.env.AUTH_X_ID!,
        clientSecret: process.env.AUTH_TWITTER_SECRET || process.env.AUTH_X_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  return list;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    ...buildOAuthProviders(),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "Authenticator code", type: "text" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(raw) {
        if (!(await isProviderEnabled("credentials"))) return null;

        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const key = `auth:${parsed.data.email.toLowerCase()}`;
        const limited = await rateLimit(key, 8, 60_000);
        if (!limited.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash || user.status === "DELETED" || user.status === "BANNED") {
          if (user) {
            await trackLogin({
              userId: user.id,
              success: false,
              provider: "credentials",
            });
          }
          return null;
        }
        if (user.status === "SUSPENDED") {
          await trackLogin({
            userId: user.id,
            success: false,
            provider: "credentials",
          });
          return null;
        }
        if (!user.emailVerified) {
          await trackLogin({
            userId: user.id,
            success: false,
            provider: "credentials",
          });
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          await trackLogin({
            userId: user.id,
            success: false,
            provider: "credentials",
          });
          return null;
        }
        if (user.twoFactorEnabled) {
          if (!parsed.data.totpCode) {
            await trackLogin({
              userId: user.id,
              success: false,
              provider: "credentials",
            });
            return null;
          }
          const { verify } = await import("otplib");
          if (
            !user.twoFactorSecret ||
            !(
              await verify({
                token: parsed.data.totpCode,
                secret: user.twoFactorSecret,
              })
            ).valid
          ) {
            await trackLogin({
              userId: user.id,
              success: false,
              provider: "credentials",
            });
            return null;
          }
        }
        await trackLogin({
          userId: user.id,
          success: true,
          provider: "credentials",
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          handle: user.handle,
          onboardingDone: user.onboardingDone,
          remember: parsed.data.remember === "true",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return true;

      if (account.provider === "credentials") {
        return (await isProviderEnabled("credentials")) ? true : "/sign-in?error=ProviderDisabled";
      }

      const provider = account.provider as OAuthProviderId;
      if (!(await isProviderEnabled(provider))) {
        return "/sign-in?error=ProviderDisabled";
      }

      const email = user.email?.toLowerCase();
      if (!email) return "/sign-in?error=EmailRequired";

      const existing = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true },
      });

      if (!existing) {
        // New OAuth user — adapter creates user; mark verified after create via event
        return true;
      }

      if (existing.status === "BANNED" || existing.status === "DELETED") {
        return "/sign-in?error=AccountUnavailable";
      }

      const already = existing.accounts.some(
        (a) =>
          a.provider === account.provider &&
          a.providerAccountId === account.providerAccountId,
      );
      if (already) return true;

      const sameProviderOtherId = existing.accounts.some(
        (a) => a.provider === account.provider,
      );
      if (sameProviderOtherId) {
        return "/sign-in?error=AccountConflict";
      }

      // Same email, new provider — offer secure linking when password account exists
      if (existing.passwordHash) {
        const token = await createPendingOAuthLink({
          email,
          provider,
          providerAccountId: account.providerAccountId,
          type: account.type,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          userName: user.name,
          userImage: user.image,
        });
        return `/link-account?token=${token}`;
      }

      // OAuth-only existing user — safe auto-link (same email, no password risk)
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.handle = (user as { handle?: string | null }).handle ?? null;
        token.onboardingDone =
          (user as { onboardingDone?: boolean }).onboardingDone ?? false;
        token.image = user.image;
        token.sub = user.id;
        const remember = (user as { remember?: boolean }).remember;
        if (remember === false) {
          token.exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = (token.role as string) || "USER";
        session.user.handle = (token.handle as string | null) ?? null;
        session.user.onboardingDone = Boolean(token.onboardingDone);
        session.user.image =
          (token.image as string | null) ?? session.user.image;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id) return;
      if (user.email) {
        await prisma.user.updateMany({
          where: { id: user.id, emailVerified: null },
          data: { emailVerified: new Date(), status: "ACTIVE" },
        });
      }
      const sessionKey = `${account?.provider ?? "credentials"}:${account?.providerAccountId ?? user.id}`;
      await Promise.all([
        upsertDeviceSession({
          userId: user.id,
          sessionKey,
          label: account?.provider ?? "credentials",
        }),
        account?.provider === "credentials"
          ? Promise.resolve()
          : trackLogin({
              userId: user.id,
              success: true,
              provider: account?.provider,
            }),
      ]);
    },
  },
});
