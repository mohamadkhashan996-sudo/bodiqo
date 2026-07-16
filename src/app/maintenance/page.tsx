import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--cloud)] px-5 text-center">
      <BrandLockup />
      <h1 className="mt-12 font-[family-name:var(--font-display)] text-4xl tracking-tight">
        Brief pause
      </h1>
      <p className="mt-4 max-w-md text-sm leading-7 text-[var(--muted)]">
        Relune is undergoing care and will return shortly. Thank you for your patience.
      </p>
      <Link
        href="/sign-in"
        className="mt-8 text-sm text-[var(--signal-deep)] hover:underline"
      >
        Staff sign in
      </Link>
    </div>
  );
}
