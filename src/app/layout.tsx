import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import { StoreChrome } from "@/components/store-chrome";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "BODIQO | Premium Marketplace",
    template: "%s | BODIQO",
  },
  description:
    "BODIQO is a premium international marketplace. Shop electronics, home, fashion, beauty, sports, and more.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    title: "BODIQO | Premium Marketplace",
    description:
      "Shop electronics, home, fashion, beauty, sports, and everyday essentials.",
    type: "website",
    siteName: "BODIQO",
  },
  twitter: {
    card: "summary_large_image",
    title: "BODIQO | Premium Marketplace",
    description:
      "Shop electronics, home, fashion, beauty, sports, and everyday essentials.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        <Providers>
          <StoreChrome>{children}</StoreChrome>
        </Providers>
      </body>
    </html>
  );
}
