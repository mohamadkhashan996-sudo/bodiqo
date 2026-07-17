import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--cloud)] text-[var(--ink)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[calc(var(--z-nav)+1)] focus:rounded-[1rem] focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--cloud)]"
      >
        Skip to content
      </a>

      <MarketingHeader />

      <div id="content" tabIndex={-1}>
        {children}
      </div>

      <footer className="relative mt-2 border-t-2 border-[var(--mist-strong)]">
        <div className="section-shell px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-12 md:grid-cols-[1.45fr_1fr] md:items-start">
            <div>
              <p className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-[0.3em] text-[var(--ink)]">
                Relune
              </p>
              <p className="mt-5 max-w-md text-sm leading-7 text-[var(--muted)] md:text-base md:leading-8">
                Presence, beautifully shared. A privacy-first social platform
                for creators, communities, and meaningful conversation.
              </p>
            </div>
            <div className="grid gap-10 sm:grid-cols-2">
              <nav className="flex flex-col gap-3.5 text-sm text-[var(--muted)]" aria-label="Product">
                <Link href="/explore" className="transition hover:text-[var(--ink)]">
                  Explore
                </Link>
                <Link href="/shorts" className="transition hover:text-[var(--ink)]">
                  Reels
                </Link>
                <Link href="/search" className="transition hover:text-[var(--ink)]">
                  Search
                </Link>
                <Link href="/sign-in" className="transition hover:text-[var(--ink)]">
                  Sign In
                </Link>
              </nav>
              <nav className="flex flex-col gap-3.5 text-sm text-[var(--muted)]" aria-label="Company">
                <Link href="/terms" className="transition hover:text-[var(--ink)]">
                  Terms
                </Link>
                <Link href="/privacy" className="transition hover:text-[var(--ink)]">
                  Privacy
                </Link>
                <Link href="/sign-up" className="transition hover:text-[var(--ink)]">
                  Create Account
                </Link>
                <Link href="/home" className="transition hover:text-[var(--ink)]">
                  Continue as Guest
                </Link>
              </nav>
            </div>
          </div>
          <p className="mt-14 text-xs tracking-[0.1em] text-[var(--muted)]">
            © {new Date().getFullYear()} RELUNE. Crafted for presence.
          </p>
        </div>
      </footer>
    </div>
  );
}
