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

const description = `${site.tagline} A premium social platform for cinematic presence, conversation, and communities.`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description,
  applicationName: site.name,
  keywords: [
    "Relune",
    "social network",
    "communities",
    "messaging",
    "stories",
    "premium social",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: site.name,
    description: site.tagline,
    type: "website",
    url: site.url,
    siteName: site.name,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.tagline,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F2EE" },
    { media: "(prefers-color-scheme: dark)", color: "#12141A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: site.name,
    description: site.tagline,
    url: site.url,
    applicationCategory: "SocialNetworkingApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <html
      lang={locale}
      data-theme={theme === "DARK" ? "dark" : "light"}
      className={`${syne.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers locale={locale} theme={theme}>
          <SplashScreen />
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-[var(--cloud)]"
          >
            Skip to content
          </a>
          <div id="app-root">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
