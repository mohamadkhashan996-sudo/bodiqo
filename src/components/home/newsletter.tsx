"use client";

import { FormEvent, useState } from "react";
import { usePreferences } from "@/components/preferences-provider";

export function Newsletter() {
  const { t } = usePreferences();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
    setEmail("");
  }

  return (
    <section className="relative overflow-hidden border-y border-[var(--border)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_55%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-8 px-5 py-20 md:flex-row md:items-end md:justify-between md:px-8 md:py-28">
        <div className="max-w-lg">
          <p className="text-[11px] tracking-[0.28em] text-[var(--accent)] uppercase">
            {t("home.newsletterEyebrow")}
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-none text-[var(--foreground)] md:text-5xl">
            {t("home.newsletterTitle")}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--foreground)]/60">
            {t("home.newsletterBody")}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
        >
          <label className="sr-only" htmlFor="newsletter-email">
            Email
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("home.newsletterPlaceholder")}
            className="flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--accent)] px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[var(--on-accent)] uppercase transition hover:bg-[var(--accent-hover)]"
          >
            {t("home.newsletterCta")}
          </button>
        </form>
        {done ? (
          <p className="absolute bottom-8 end-8 text-sm text-[var(--accent)] md:static md:mt-0">
            {t("home.newsletterThanks")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
