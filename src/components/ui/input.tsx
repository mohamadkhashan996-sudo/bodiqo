"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-lg)] border border-[var(--mist)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] outline-none shadow-[var(--shadow-sm)] transition placeholder:text-[var(--muted)] focus:border-[var(--signal)] focus:bg-[var(--cloud-elevated)]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-none rounded-[var(--radius-xl)] border border-[var(--mist)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] outline-none shadow-[var(--shadow-sm)] transition placeholder:text-[var(--muted)] focus:border-[var(--signal)] focus:bg-[var(--cloud-elevated)]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
