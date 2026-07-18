import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  interactive = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "surface-panel min-w-0 rounded-[var(--radius-xl)] p-5 backdrop-blur-xl transition-[transform,box-shadow,border-color,background-color] duration-[var(--duration)] ease-[var(--ease-out)]",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--ink)_28%,var(--mist-strong))] hover:shadow-[var(--shadow-md)] motion-reduce:hover:transform-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "surface-subtle flex flex-col items-center justify-center rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--mist-strong)] px-6 py-16 text-center shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {icon ? (
        <div
          className="mb-5 grid size-14 place-items-center rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] text-[var(--signal-deep)] shadow-[var(--shadow-sm)]"
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-balance">
        {title}
      </p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-pretty text-[var(--muted-strong)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Skeleton({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("skeleton", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "status" : undefined}
    />
  );
}

export function StateBanner({
  tone = "success",
  children,
}: {
  tone?: "success" | "error" | "warning";
  children: React.ReactNode;
}) {
  const color =
    tone === "success"
      ? "var(--success)"
      : tone === "warning"
        ? "var(--warning)"
        : "var(--danger)";
  return (
    <div
      role="status"
      className="rounded-[var(--radius-lg)] border-2 px-4 py-3 text-sm font-medium shadow-[var(--shadow-sm)]"
      style={{
        borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
        background: `color-mix(in srgb, ${color} 16%, var(--surface))`,
        color,
      }}
    >
      {children}
    </div>
  );
}
