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
      "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
      variant === "solid" &&
        "bg-[var(--ink)] text-[var(--cloud)] shadow-[var(--shadow)] hover:shadow-lg",
      variant === "signal" &&
        "bg-[var(--signal)] text-[var(--ink)] hover:bg-[var(--signal-deep)] hover:text-[var(--cloud)]",
      variant === "outline" &&
        "border border-[var(--mist)] bg-[var(--glass)] backdrop-blur hover:border-[var(--ink)]",
      variant === "quiet" &&
        "text-[var(--muted)] hover:bg-[var(--mist)] hover:text-[var(--ink)]",
      variant === "danger" && "bg-[var(--danger)] text-white",
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";
