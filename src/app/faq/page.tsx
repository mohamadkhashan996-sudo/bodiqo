const FAQ = [
  {
    q: "What does BODIQO sell?",
    a: "Anything physical — electronics, home, fashion, beauty, sports, automotive, and more. Categories are managed from the admin dashboard.",
  },
  {
    q: "How do I track my order?",
    a: "Use Track Order with your order number and email, or sign in to your account dashboard.",
  },
  {
    q: "Which payment methods are supported?",
    a: "PayPal, Stripe (including Apple Pay / Google Pay when enabled), and manual checkout when configured.",
  },
  {
    q: "Can I get a refund?",
    a: "See our Refund Policy. Approved refunds restore inventory and return funds when possible.",
  },
];

export const metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        Help
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        FAQ
      </h1>
      <div className="mt-12 space-y-6">
        {FAQ.map((item) => (
          <div
            key={item.q}
            className="rounded-2xl border border-white/10 bg-[#121212] p-6"
          >
            <h2 className="text-lg text-[#f3efe6]">{item.q}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#f3efe6]/60">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
