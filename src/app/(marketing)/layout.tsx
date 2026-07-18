import Link from "next/link";

import { MarketingHeader } from "@/components/marketing/marketing-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--cloud)] text-[var(--ink)]">
      <MarketingHeader />

      <div id="content" tabIndex={-1}>
        {children}
      </div>

      <footer className="relative mt-2 border-t-2 border-[var(--mist-strong)] bg-[color-mix(in_srgb,var(--cloud-elevated)_70%,transparent)]">
        <div className="section-shell px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-12 md:grid-cols-[1.45fr_1fr] md:items-start">
            <div>
              <p className="font-[family-name:var(--font-display)] text-2xl tracking-[0.28em] text-[var(--ink)] uppercase">
                Relune
              </p>
              <p className="page-subtitle mt-5 max-w-md text-sm md:text-base md:leading-8">
                Presence, beautifully shared. A privacy-first social platform
                for creators, communities, and meaningful conversation.
              </p>
            </div>
            <div className="grid gap-10 sm:grid-cols-2">
              <nav className="flex flex-col gap-1" aria-label="Product">
                <p className="kicker mb-2">Product</p>
                <Link href="/explore" className="footer-link">
                  Explore
                </Link>
                <Link href="/shorts" className="footer-link">
                  Reels
                </Link>
                <Link href="/search" className="footer-link">
                  Search
                </Link>
                <Link href="/sign-in" className="footer-link">
                  Sign In
                </Link>
              </nav>
              <nav className="flex flex-col gap-1" aria-label="Company">
                <p className="kicker mb-2">Company</p>
                <Link href="/terms" className="footer-link">
                  Terms
                </Link>
                <Link href="/privacy" className="footer-link">
                  Privacy
                </Link>
                <Link href="/sign-up" className="footer-link">
                  Create Account
                </Link>
                <Link href="/home" className="footer-link">
                  Continue as Guest
                </Link>
              </nav>
            </div>
          </div>
          <p className="mt-14 text-xs tracking-[0.12em] text-[var(--muted)]">
            © {new Date().getFullYear()} Relune. Crafted for presence.
          </p>
        </div>
      </footer>
    </div>
  );
}
