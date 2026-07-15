export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-32">
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        Our story
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6] md:text-6xl">
        Shop everything. Beautifully.
      </h1>
      <div className="mt-8 space-y-5 text-sm leading-7 text-[#f3efe6]/65 md:text-base">
        <p>
          BODIQO is a premium international marketplace for physical products —
          electronics, home, fashion, beauty, sports, automotive, and beyond.
        </p>
        <p>
          This platform is fully standalone (not Shopify). Catalog, inventory,
          payments, shipping, content, and dropshipping are managed from a
          Shopify-like admin so daily operations never require code.
        </p>
        <p>
          Every detail is designed for clarity: luxury minimal UI, instant
          search, and a checkout that feels effortless on every device.
        </p>
      </div>
    </div>
  );
}
