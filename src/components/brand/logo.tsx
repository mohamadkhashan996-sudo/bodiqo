import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ReluneMark({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/brand/mark.png"
      alt="Relune"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority
    />
  );
}

export function BrandLockup({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <ReluneMark size={34} />
      <span className="font-[family-name:var(--font-display)] text-xl uppercase tracking-[0.28em]">
        Relune
      </span>
    </Link>
  );
}
