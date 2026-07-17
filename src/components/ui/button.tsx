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
      "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition-[transform,background-color,color,border-color,box-shadow,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
      variant === "solid" &&
        "border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--cloud-elevated)] shadow-[var(--shadow-md)] hover:bg-[var(--ink-soft)] hover:shadow-[var(--shadow-lg)]",
      variant === "signal" &&
        "border-2 border-[var(--signal-deep)] bg-[var(--signal-deep)] text-white shadow-[var(--shadow-sm)] hover:bg-[color:color-mix(in_srgb,var(--signal-deep)_88%,black)] hover:shadow-[var(--shadow-md)]",
      variant === "outline" &&
        "border-2 border-[var(--mist-strong)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)] hover:border-[color:color-mix(in_srgb,var(--ink)_40%,var(--mist-strong))] hover:bg-[var(--cloud-elevated)] hover:shadow-[var(--shadow-md)]",
      variant === "quiet" &&
        "border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] text-[var(--ink)] shadow-[var(--shadow-sm)] hover:border-[color:color-mix(in_srgb,var(--ink)_35%,var(--mist-strong))] hover:bg-[var(--surface)]",
      variant === "danger" &&
        "border-2 border-[var(--danger)] bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:bg-[color:color-mix(in_srgb,var(--danger)_90%,black)] hover:shadow-[var(--shadow-md)]",
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";
