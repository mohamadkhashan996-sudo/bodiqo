import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";

import { ClientErrorReporter } from "@/components/observability/client-error-reporter";
import { AccountReluneGate } from "@/components/platform/account-relune-gate";
import { OfficialManageBannerGate } from "@/components/platform/official-manage-banner-gate";
import { Providers } from "@/components/providers";
import { RuntimeGuardScript } from "@/components/runtime-guard-script";
import { ThemeBootScript } from "@/components/theme-boot-script";
import { site } from "@/config/site";

import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: site.name,
    description: site.tagline,
    type: "website",
    url: site.url,
    siteName: site.name,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: site.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.tagline,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
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
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      lang="en"
      data-theme="light"
      className={`${syne.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeBootScript />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
          crossOrigin=""
        />
      </head>
      <body>
        <RuntimeGuardScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <ClientErrorReporter />
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-[var(--cloud)]"
          >
            Skip to content
          </a>
          <div id="app-root">{children}</div>
          <OfficialManageBannerGate />
          <AccountReluneGate />
        </Providers>
      </body>
    </html>
  );
}
