export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        Support
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Contact
      </h1>
      <p className="mt-5 text-[15px] leading-relaxed text-[#f3efe6]/60">
        Questions about orders, shipping, or products? Email us and we will
        reply within one business day.
      </p>
      <div className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6 text-sm text-[#f3efe6]/75">
        <p>
          Email:{" "}
          <a href="mailto:support@bodiqo.com" className="text-[#4a8cff]">
            support@bodiqo.com
          </a>
        </p>
        <p>
          Track an existing order:{" "}
          <a href="/track-order" className="text-[#4a8cff]">
            Track order
          </a>
        </p>
      </div>
    </div>
  );
}
