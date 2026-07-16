import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { auth } from "@/modules/auth";
import { Providers } from "@/components/providers";
import { SplashScreen } from "@/components/motion/splash";
import { site } from "@/config/site";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: `${site.tagline} A premium social platform.`,
  applicationName: site.name,
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: site.name,
    description: site.tagline,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F2EE" },
    { media: "(prefers-color-scheme: dark)", color: "#12141A" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  let locale = "en";
  let theme: "LIGHT" | "DARK" | "SYSTEM" = "SYSTEM";
  if (session?.user?.id) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { locale: true, theme: true },
      });
      if (user?.locale) locale = user.locale;
      if (user?.theme) theme = user.theme;
    } catch {
      /* ignore */
    }
  }

  return (
    <html
      lang={locale}
      data-theme={theme === "DARK" ? "dark" : "light"}
      className={`${syne.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers locale={locale} theme={theme}>
          <SplashScreen />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-[var(--cloud)]"
          >
            Skip to content
          </a>
          <div id="main">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
