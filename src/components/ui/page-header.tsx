import { cn } from "@/lib/utils";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
  compact = false,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "glass-strong premium-ring hero-panel",
        compact && "py-5 md:py-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          {kicker ? <p className="kicker">{kicker}</p> : null}
          <h1
            className={cn(
              "font-[family-name:var(--font-display)] tracking-tight text-balance",
              kicker ? "mt-2" : null,
              compact
                ? "text-2xl sm:text-3xl"
                : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="page-subtitle mt-3 text-sm leading-7 md:text-[0.975rem]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2.5 sm:w-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
