import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-12 flex items-end justify-between gap-6 md:mb-14">
      <div className="max-w-xl">
        <p className="text-[11px] tracking-[0.28em] text-[var(--accent)] uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-none text-[var(--foreground)] md:text-5xl">
          {title}
        </h2>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="hidden text-[11px] tracking-[0.22em] text-[var(--foreground)]/55 uppercase transition hover:text-[var(--accent)] md:inline"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
