export const metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the Relune social platform.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:px-8">
      <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--signal)] uppercase">
        Legal
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
        Terms of Service
      </h1>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Last updated: July 2026
      </p>
      <div className="prose prose-sm mt-10 max-w-none space-y-6 text-[var(--ink)]">
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            1. Acceptance
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            By accessing Relune you agree to these terms. If you do not agree,
            do not use the service.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            2. Your account
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            You are responsible for safeguarding your credentials and for
            activity under your account. We may suspend accounts that violate
            community standards or applicable law.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            3. Content
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            You retain rights to content you post. You grant Relune a limited
            license to host, display, and distribute your content solely to
            operate the service. Do not upload unlawful, abusive, or infringing
            material.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            4. Availability
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Relune is provided as-is. We may modify features, enforce
            maintenance windows, and update these terms with reasonable notice
            where required.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            5. Contact
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Questions about these terms: legal@relune.app
          </p>
        </section>
      </div>
    </article>
  );
}
