"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "quiet" | "outline" | "signal" | "danger";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "solid", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase transition-[transform,background-color,color,border-color,box-shadow,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
      variant === "solid" &&
        "bg-[var(--ink)] text-[var(--cloud)] shadow-[var(--shadow-md)] hover:bg-[var(--ink-soft)] hover:shadow-[var(--shadow-lg)]",
      variant === "signal" &&
        "bg-[var(--signal)] text-[var(--cloud)] shadow-[var(--shadow-sm)] hover:bg-[var(--signal-deep)] hover:shadow-[var(--shadow-md)]",
      variant === "outline" &&
        "border border-[var(--mist)] bg-[var(--glass-strong)] text-[var(--ink)] backdrop-blur hover:border-[color:color-mix(in_srgb,var(--ink)_18%,var(--mist))] hover:bg-[var(--surface)] hover:shadow-[var(--shadow-sm)]",
      variant === "quiet" &&
        "text-[var(--muted)] hover:bg-[color:color-mix(in_srgb,var(--mist)_80%,transparent)] hover:text-[var(--ink)]",
      variant === "danger" &&
        "bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:bg-[color:color-mix(in_srgb,var(--danger)_92%,black)] hover:shadow-[var(--shadow-md)]",
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";
