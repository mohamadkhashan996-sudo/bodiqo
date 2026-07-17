"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full min-h-11 rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-3 text-[0.9375rem] leading-normal text-[var(--ink)] outline-none shadow-[var(--shadow-sm)] transition placeholder:text-[var(--placeholder)] focus:border-[var(--signal-deep)] focus:bg-[var(--cloud-elevated)] focus:shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldBase, "resize-none rounded-[var(--radius-xl)]", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/** Shared class for one-off auth/settings fields that aren't the Input component. */
export const fieldClassName = fieldBase;
