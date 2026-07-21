import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { randomToken } from "@/lib/tokens";
import {
  OFFICIAL_IMPERSONATE_PURPOSE,
  OFFICIAL_RETURN_PURPOSE,
} from "@/modules/admin/services/official-session";
import { consumeAuthChallenge } from "@/modules/auth/challenges";
import { verifyPassword } from "@/modules/auth/password";
import { alertNewLogin } from "@/modules/auth/security";
import { getAuthSecurityPolicy } from "@/modules/auth/security-policy";
import { trackLogin, upsertDeviceSession } from "@/modules/auth/session-track";
import { verifyTotpOrBackup } from "@/modules/auth/two-factor";
import { isOfficialUser } from "@/modules/platform/official-account";
import { officialFollowNewUser } from "@/modules/platform/official-account";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  totpCode: z.string().trim().optional(),
  remember: z.string().optional(),
});

const challengeSchema = z.object({
  token: z.string().min(10),
  totpCode: z.string().trim().optional(),
  remember: z.string().optional(),
});

async function requestMeta() {
  try {
    const h = await headers();
    return {
      ip:
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        null,
      ua: h.get("user-agent"),
    };
  } catch {
    return { ip: null, ua: null };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-authjs.csrf-token"
          : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.callback-url"
          : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge:
      Math.min(365, Math.max(1, Number(process.env.SESSION_DAYS) || 30)) *
      24 *
      60 *
      60,
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "Authenticator code", type: "text" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const meta = await requestMeta();
        const key = `auth:${parsed.data.email.toLowerCase()}`;
        const limited = await rateLimit(key, 8, 60_000);
        if (!limited.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;
        if (isOfficialUser(user)) return null;

        if (
          user.status === "DELETED" ||
          user.status === "BANNED" ||
          user.status === "SUSPENDED"
        ) {
          await trackLogin({
            userId: user.id,
            success: false,
            provider: "credentials",
            ip: meta.ip,
            ua: meta.ua,
          });
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await trackLogin({
            userId: user.id,
            success: false,
            provider: "credentials",
            ip: meta.ip,
            ua: meta.ua,
          });
          return null;
        }

        if (!user.emailVerified) {
          await trackLogin({
            userId: user.id,
            success: false,
            provider: "credentials",
            ip: meta.ip,
            ua: meta.ua,
          });
          return null;
        }

        const ok = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );
        if (!ok) {
          const policy = await getAuthSecurityPolicy();
          const fails = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: fails,
              ...(fails >= policy.maxLoginAttempts
                ? { lockedUntil: new Date(Date.now() + policy.lockoutMs) }
                : {}),
            },
          });
          await trackLogin({
            userId: user.id,
            success: false,
            provider: "credentials",
            ip: meta.ip,
            ua: meta.ua,
          });
          return null;
        }

        if (user.twoFactorEnabled) {
          try {
            await verifyTotpOrBackup(
              user.id,
              user.twoFactorSecret,
              parsed.data.totpCode || "",
            );
          } catch {
            await trackLogin({
              userId: user.id,
              success: false,
              provider: "credentials",
              ip: meta.ip,
              ua: meta.ua,
            });
            return null;
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null },
        });
        await trackLogin({
          userId: user.id,
          success: true,
          provider: "credentials",
          ip: meta.ip,
          ua: meta.ua,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          handle: user.handle,
          onboardingDone: user.onboardingDone,
          sessionVersion: user.sessionVersion,
          remember: parsed.data.remember === "true",
        };
      },
    }),
    Credentials({
      id: "challenge",
      name: "challenge",
      credentials: {
        token: { label: "Token", type: "text" },
        totpCode: { label: "Code", type: "text" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(raw) {
        const parsed = challengeSchema.safeParse(raw);
        if (!parsed.success) return null;
        const meta = await requestMeta();
        try {
          // Peek purpose via hash lookup first
          const { hashOpaque } = await import("@/modules/auth/password");
          const pending = await prisma.authChallenge.findUnique({
            where: { tokenHash: hashOpaque(parsed.data.token) },
            include: {
              user: true,
            },
          });
          if (
            !pending ||
            pending.usedAt ||
            pending.expiresAt < new Date() ||
            ![
              "SESSION_READY",
              "PHONE_2FA",
              "CREDENTIALS_2FA",
              OFFICIAL_IMPERSONATE_PURPOSE,
              OFFICIAL_RETURN_PURPOSE,
            ].includes(pending.purpose)
          ) {
            return null;
          }

          const user = pending.user;
          const challengeMeta = pending.meta as {
            provider?: string;
            impersonatorId?: string;
            impersonatorSessionVersion?: number;
            impersonatorRole?: string;
            restoredSessionVersion?: number;
          } | null;
          if (
            user.status === "DELETED" ||
            user.status === "BANNED" ||
            user.status === "SUSPENDED"
          ) {
            return null;
          }

          // Official account may only be entered via Super Admin impersonation.
          if (
            isOfficialUser(user) &&
            pending.purpose !== OFFICIAL_IMPERSONATE_PURPOSE
          ) {
            return null;
          }

          if (pending.purpose === OFFICIAL_IMPERSONATE_PURPOSE) {
            if (
              !challengeMeta?.impersonatorId ||
              challengeMeta.impersonatorRole !== "SUPER_ADMIN" ||
              typeof challengeMeta.impersonatorSessionVersion !== "number"
            ) {
              return null;
            }
            const admin = await prisma.user.findUnique({
              where: { id: challengeMeta.impersonatorId },
              select: { role: true, status: true, sessionVersion: true },
            });
            if (
              !admin ||
              admin.role !== "SUPER_ADMIN" ||
              admin.status !== "ACTIVE" ||
              admin.sessionVersion !== challengeMeta.impersonatorSessionVersion
            ) {
              return null;
            }
          }

          if (
            pending.purpose === OFFICIAL_RETURN_PURPOSE &&
            (user.role !== "SUPER_ADMIN" ||
              typeof challengeMeta?.restoredSessionVersion !== "number" ||
              user.sessionVersion !== challengeMeta.restoredSessionVersion)
          ) {
            return null;
          }

          if (
            pending.purpose === "PHONE_2FA" ||
            pending.purpose === "CREDENTIALS_2FA"
          ) {
            if (!user.twoFactorEnabled) return null;
            await verifyTotpOrBackup(
              user.id,
              user.twoFactorSecret,
              parsed.data.totpCode || "",
            );
          }

          await consumeAuthChallenge(parsed.data.token, pending.purpose);
          const metaProvider = challengeMeta?.provider;
          const impersonatorId =
            pending.purpose === OFFICIAL_IMPERSONATE_PURPOSE
              ? challengeMeta?.impersonatorId
              : undefined;

          if (
            pending.purpose === OFFICIAL_IMPERSONATE_PURPOSE &&
            !impersonatorId
          ) {
            return null;
          }

          await trackLogin({
            userId: user.id,
            success: true,
            provider:
              metaProvider ??
              (pending.purpose === OFFICIAL_IMPERSONATE_PURPOSE ||
              pending.purpose === OFFICIAL_RETURN_PURPOSE
                ? "official"
                : pending.purpose === "PHONE_2FA"
                  ? "phone"
                  : "credentials"),
            ip: meta.ip,
            ua: meta.ua,
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            handle: user.handle,
            onboardingDone: user.onboardingDone,
            sessionVersion: user.sessionVersion,
            remember: parsed.data.remember !== "false",
            impersonatorId,
            impersonatorSessionVersion:
              pending.purpose === OFFICIAL_IMPERSONATE_PURPOSE
                ? challengeMeta?.impersonatorSessionVersion
                : undefined,
            managingOfficial: Boolean(impersonatorId),
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        const userId = user.id;
        if (!userId) return null;
        token.role = (user as { role?: string }).role;
        token.handle = (user as { handle?: string | null }).handle ?? null;
        token.onboardingDone =
          (user as { onboardingDone?: boolean }).onboardingDone ?? false;
        token.image = user.image;
        token.sub = userId;
        token.sessionVersion =
          (user as { sessionVersion?: number }).sessionVersion ?? 0;
        const remember = (user as { remember?: boolean }).remember;
        token.remember = remember !== false;
        const impersonatorId = (user as { impersonatorId?: string })
          .impersonatorId;
        if (impersonatorId) {
          const impersonatorSessionVersion = (
            user as { impersonatorSessionVersion?: number }
          ).impersonatorSessionVersion;
          if (typeof impersonatorSessionVersion !== "number") return null;
          token.impersonatorId = impersonatorId;
          token.impersonatorSessionVersion = impersonatorSessionVersion;
          token.managingOfficial = true;
        } else {
          delete token.impersonatorId;
          delete token.impersonatorSessionVersion;
          delete token.managingOfficial;
        }
        const policy = await getAuthSecurityPolicy();
        const sessionSeconds =
          (remember === false ? 1 : policy.sessionDays) * 24 * 60 * 60;
        token.exp = Math.floor(Date.now() / 1000) + sessionSeconds;

        const meta = await requestMeta();
        const provider = account?.provider ?? "credentials";
        const sessionKey = `${provider}:${randomToken(32)}`;
        const device = await upsertDeviceSession({
          userId,
          sessionKey,
          label: provider,
          ip: meta.ip,
          ua: meta.ua,
        });
        token.sessionKey = sessionKey;
        token.deviceSessionId = device.id;
      } else if (token.remember === false) {
        const max = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
        if (typeof token.exp !== "number" || token.exp > max) {
          token.exp = max;
        }
      } else if (typeof token.exp === "number") {
        const policy = await getAuthSecurityPolicy();
        const max =
          Math.floor(Date.now() / 1000) + policy.sessionDays * 24 * 60 * 60;
        if (token.exp > max) {
          token.exp = max;
        }
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            sessionVersion: true,
            status: true,
            role: true,
            handle: true,
            onboardingDone: true,
            image: true,
          },
        });
        if (
          !dbUser ||
          dbUser.status === "BANNED" ||
          dbUser.status === "DELETED" ||
          dbUser.status === "SUSPENDED" ||
          typeof token.sessionVersion !== "number" ||
          dbUser.sessionVersion !== token.sessionVersion ||
          typeof token.sessionKey !== "string" ||
          !token.sessionKey
        ) {
          return null;
        }

        const device = await prisma.deviceSession.findUnique({
          where: { sessionKey: token.sessionKey },
          select: {
            revokedAt: true,
            id: true,
            lastActiveAt: true,
            userId: true,
          },
        });
        if (!device || device.revokedAt || device.userId !== token.sub) {
          return null;
        }
        token.deviceSessionId = device.id;
        if (Date.now() - device.lastActiveAt.getTime() > 5 * 60_000) {
          await prisma.deviceSession
            .update({
              where: { id: device.id },
              data: { lastActiveAt: new Date() },
            })
            .catch(() => undefined);
        }

        if (typeof token.impersonatorId === "string") {
          if (typeof token.impersonatorSessionVersion !== "number") return null;
          const impersonator = await prisma.user.findUnique({
            where: { id: token.impersonatorId },
            select: { role: true, status: true, sessionVersion: true },
          });
          if (
            !impersonator ||
            impersonator.role !== "SUPER_ADMIN" ||
            impersonator.status !== "ACTIVE" ||
            impersonator.sessionVersion !== token.impersonatorSessionVersion
          ) {
            return null;
          }
        }

        token.role = dbUser.role;
        token.handle = dbUser.handle;
        token.onboardingDone = dbUser.onboardingDone;
        token.image = dbUser.image;
        if (trigger === "update") {
          token.sessionVersion = dbUser.sessionVersion;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (!token?.sub) {
        return session;
      }
      if (session.user) {
        session.user.id = token.sub;
        session.user.role =
          typeof token.role === "string" ? token.role : "USER";
        session.user.handle =
          typeof token.handle === "string" || token.handle === null
            ? token.handle
            : null;
        session.user.onboardingDone = Boolean(token.onboardingDone);
        session.user.image =
          typeof token.image === "string" || token.image === null
            ? token.image
            : (session.user.image ?? null);
        session.deviceSessionId =
          typeof token.deviceSessionId === "string"
            ? token.deviceSessionId
            : undefined;
        if (typeof token.impersonatorId === "string") {
          session.impersonatorId = token.impersonatorId;
          session.managingOfficial = true;
        }
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id) return;
      const meta = await requestMeta();
      const sessionKey = `${account?.provider ?? "credentials"}:${account?.providerAccountId ?? user.id}:${meta.ip ?? "local"}`;
      await Promise.all([
        upsertDeviceSession({
          userId: user.id,
          sessionKey,
          label: account?.provider ?? "credentials",
          ip: meta.ip,
          ua: meta.ua,
        }),
        account?.provider === "credentials" || account?.provider === "challenge"
          ? Promise.resolve()
          : trackLogin({
              userId: user.id,
              success: true,
              provider: account?.provider,
              ip: meta.ip,
              ua: meta.ua,
            }),
        alertNewLogin({
          userId: user.id,
          ip: meta.ip,
          ua: meta.ua,
          provider: account?.provider,
        }),
        officialFollowNewUser(user.id),
      ]);
    },
  },
});
