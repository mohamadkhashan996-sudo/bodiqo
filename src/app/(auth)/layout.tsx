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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--signal)_22%,transparent),_transparent_55%),linear-gradient(160deg,var(--cloud),color-mix(in_oklab,var(--signal)_8%,var(--cloud)))]"
      />
      <div className="relative mx-auto flex max-w-lg flex-col px-5 py-10 md:px-8">
        <BrandLockup />
        <div className="mt-12">{children}</div>
        <p className="mt-10 text-sm text-[var(--muted)]">
          <Link href="/" className="text-[var(--signal)] hover:underline">
            Back to Relune
          </Link>
        </p>
      </div>
    </div>
  );
}
