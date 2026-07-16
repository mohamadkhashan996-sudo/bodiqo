import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function CirquaMark({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/brand/mark.png"
      alt="Cirqua"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority
    />
  );
}

export function CirquaWordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/wordmark.png"
      alt="Cirqua"
      width={220}
      height={56}
      className={cn("h-8 w-auto object-contain object-left md:h-10", className)}
      priority
    />
  );
}

export function BrandLockup({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3">
      <CirquaMark size={34} />
      <span className="font-[family-name:var(--font-display)] text-xl tracking-[0.28em] uppercase">
        Cirqua
      </span>
    </Link>
  );
}
