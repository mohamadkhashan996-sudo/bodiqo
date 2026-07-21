import Link from "next/link";

import { BrandLockup } from "@/components/brand/logo";
import { AppProviders } from "@/components/providers";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <div
        id="content"
        tabIndex={-1}
        className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-[var(--cloud)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--signal)_22%,transparent),_transparent_55%),radial-gradient(ellipse_at_100%_0%,color-mix(in_oklab,var(--ember)_16%,transparent),transparent_38%),linear-gradient(160deg,var(--cloud),color-mix(in_oklab,var(--signal)_8%,var(--cloud)))]"
        />
        <div className="relative mx-auto flex min-h-dvh max-w-6xl items-start px-4 py-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-5 md:items-center md:px-8 md:py-10">
          <div className="grid w-full min-w-0 items-center gap-8 sm:gap-10 lg:grid-cols-[0.95fr_0.8fr]">
            <div className="hidden min-w-0 lg:block">
              <p className="kicker">Trust-first authentication</p>
              <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-[1.02] tracking-tight xl:text-6xl">
                Sign in to the premium social layer of Relune.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[var(--muted)]">
                Elegant access, secure sessions, email and phone sign-in, device
                controls, recovery options, and modern account protection built
                for real production use.
              </p>
              <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
                {[
                  [
                    "Protected accounts",
                    "2FA, recovery codes, trusted devices, and login history.",
                  ],
                  [
                    "Flexible sign-in",
                    "Choose secure email and password or phone verification.",
                  ],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="glass rounded-[var(--radius-xl)] p-5"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-strong premium-ring mx-auto w-full max-w-xl min-w-0 rounded-[var(--radius-2xl)] px-4 py-7 shadow-[var(--shadow-xl)] sm:px-5 sm:py-8 md:px-8 md:py-10">
              <BrandLockup />
              <div className="mt-8 min-w-0">{children}</div>
              <p className="mt-10 text-sm text-[var(--muted)]">
                <Link
                  href="/"
                  className="font-medium text-[var(--signal-deep)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)]"
                >
                  Back to Relune
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppProviders>
  );
}
