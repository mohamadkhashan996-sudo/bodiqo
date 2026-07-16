"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "quiet" | "outline" }>(({ className, variant = "solid", ...props }, ref) => (
  <button ref={ref} className={cn("inline-flex items-center justify-center rounded-full px-4 py-2.5 text-xs font-semibold tracking-[.12em] uppercase transition duration-200 disabled:cursor-not-allowed disabled:opacity-50", variant === "solid" && "bg-[var(--ink)] text-[var(--cloud)] hover:-translate-y-0.5 hover:shadow-lg", variant === "outline" && "border border-[var(--mist)] bg-white/40 hover:bg-white", variant === "quiet" && "text-[var(--muted)] hover:bg-[var(--mist)] hover:text-[var(--ink)]", className)} {...props} />
));
Button.displayName = "Button";
