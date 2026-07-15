import Link from "next/link";

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-5 pt-36 pb-24 text-center md:px-8">
      <p className="text-[11px] tracking-[0.24em] text-[#d4b483] uppercase">
        Confirmed
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Thank you
      </h1>
      <p className="mt-4 text-[#f3efe6]/65">
        Your BODIQO order
        {order ? (
          <>
            {" "}
            <span className="text-[#d4b483]">{order}</span>
          </>
        ) : null}{" "}
        has been received. We will email shipping updates shortly.
      </p>
      <Link
        href="/shop"
        className="mt-10 inline-block bg-[#d4b483] px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase"
      >
        Continue shopping
      </Link>
    </div>
  );
}
