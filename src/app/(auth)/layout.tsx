import { BrandLockup } from "@/components/brand/logo";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--cloud)]">
      <div className="mx-auto flex max-w-lg flex-col px-5 py-10 md:px-8">
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
