export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-32">
      <p className="text-[11px] tracking-[0.24em] text-[#d4b483] uppercase">
        Our story
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6] md:text-6xl">
        Built for the drive
      </h1>
      <div className="mt-8 space-y-5 text-sm leading-7 text-[#f3efe6]/65 md:text-base">
        <p>
          BODIQO is a premium automotive accessories brand focused on products
          that elevate everyday driving — from phone holders and dash cameras to
          power, care, and cabin essentials.
        </p>
        <p>
          This storefront is a standalone e-commerce platform (not Shopify),
          with a catalog seeded from the existing BODIQO product range so
          shoppers see the real collection from day one.
        </p>
        <p>
          Every piece is curated for finish, reliability, and a modern cabin
          aesthetic — accessories that feel intentional, not improvised.
        </p>
      </div>
    </div>
  );
}
