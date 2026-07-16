import { BrandLockup } from "@/components/brand/logo";
import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--cloud)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <BrandLockup />
        <nav className="flex items-center gap-3 text-sm md:gap-5">
          <Link
            href="/sign-in"
            className="text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-[11px] font-semibold tracking-[0.18em] text-[var(--cloud)] uppercase"
          >
            Join Cirqua
          </Link>
        </nav>
      </header>
      {children}
      <footer className="mx-auto max-w-6xl border-t border-[var(--mist)] px-5 py-10 text-sm text-[var(--muted)] md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="tracking-[0.22em] uppercase">Cirqua</p>
          <p>Presence, beautifully shared.</p>
        </div>
      </footer>
    </div>
  );
}
