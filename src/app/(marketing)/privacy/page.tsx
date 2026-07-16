import { PageTransition } from "@/components/motion/primitives";

export const metadata = {
  title: "Privacy Policy — Relune",
};

export default function PrivacyPolicyPage() {
  return (
    <PageTransition className="mx-auto max-w-3xl px-5 py-16 md:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
        Legal
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
        Privacy Policy
      </h1>
      <p className="mt-4 text-sm text-[var(--muted)]">Last updated: July 2026</p>
      <div className="prose prose-sm mt-10 max-w-none space-y-6 text-[var(--ink)]">
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">What we collect</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Account details (email, profile, handle), content you create, device/session metadata for
            security, and usage signals needed to operate messaging, calls, and moderation.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">How we use it</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            To authenticate you, deliver the service, prevent abuse, comply with law, and improve
            reliability. We do not sell personal data.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Retention & deletion</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            We retain data while your account is active and as needed for security and legal obligations.
            You may request account deletion from settings or by contacting support.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Your rights</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Depending on your region you may access, correct, export, or delete personal data.
            Contact privacy@relune.app for requests.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Cookies & sessions</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Relune uses essential cookies for authentication and security. Optional analytics providers
            are configured by the operator and disclosed at deploy time.
          </p>
        </section>
      </div>
    </PageTransition>
  );
}
