import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";

const nav = [
  { href: "/home", label: "Home" },
  { href: "/home#circles", label: "Circles" },
  { href: "/home#messages", label: "Messages" },
  { href: "/home#studio", label: "Studio" },
];

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--cloud)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--mist)] bg-[var(--cloud)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <BrandLockup href="/home" />
          <nav className="hidden items-center gap-6 text-[11px] tracking-[0.18em] uppercase md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[var(--muted)] transition hover:text-[var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/sign-in"
            className="rounded-full border border-[var(--mist)] px-4 py-2 text-[11px] tracking-[0.16em] uppercase"
          >
            Account
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        {children}
      </main>
    </div>
  );
}
