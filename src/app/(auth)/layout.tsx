import { BrandLockup } from "@/components/brand/logo";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--cloud)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--signal)_22%,transparent),_transparent_55%),radial-gradient(ellipse_at_100%_0%,color-mix(in_oklab,var(--ember)_16%,transparent),transparent_38%),linear-gradient(160deg,var(--cloud),color-mix(in_oklab,var(--signal)_8%,var(--cloud)))]"
      />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10 md:px-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[0.95fr_0.8fr]">
          <div className="hidden lg:block">
            <p className="kicker">Trust-first authentication</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-[1.02] tracking-tight">
              Sign in to the premium social layer of RELUNE.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[var(--muted)]">
              Elegant access, secure sessions, multi-provider sign-in, device controls,
              recovery options, and modern account protection built for real production use.
            </p>
            <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
              {[
                ["Protected accounts", "2FA, recovery codes, trusted devices, and login history."],
                ["Flexible sign-in", "Email, phone, Google, Apple, Facebook, and X where enabled."],
              ].map(([title, body]) => (
                <div key={title} className="glass rounded-[var(--radius-xl)] p-5">
                  <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-strong premium-ring mx-auto w-full max-w-xl rounded-[2rem] px-5 py-8 shadow-[var(--shadow-lg)] md:px-8">
            <BrandLockup />
            <div className="mt-8">{children}</div>
            <p className="mt-10 text-sm text-[var(--muted)]">
          <Link href="/" className="text-[var(--signal)] hover:underline">
            Back to Relune
          </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
