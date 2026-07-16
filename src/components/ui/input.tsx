"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-2xl border border-[var(--mist)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--ink)] outline-none backdrop-blur transition placeholder:text-[var(--muted)] focus:border-[var(--signal)]",
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
      "w-full resize-none rounded-3xl border border-[var(--mist)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--ink)] outline-none backdrop-blur transition placeholder:text-[var(--muted)] focus:border-[var(--signal)]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
