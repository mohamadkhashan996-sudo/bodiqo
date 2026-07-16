import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { Providers } from "@/components/providers";
import { SplashScreen } from "@/components/motion/splash";
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
    default: "Cirqua",
    template: "%s · Cirqua",
  },
  description: "Presence, beautifully shared. A premium social platform.",
  applicationName: "Cirqua",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Cirqua",
    description: "Presence, beautifully shared.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F4F2EE",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className={`${syne.variable} ${dmSans.variable}`}>
      <body>
        <Providers>
          <SplashScreen />
          {children}
        </Providers>
      </body>
    </html>
  );
}
