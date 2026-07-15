import Link from "next/link";
import { ClearCartOnMount } from "@/components/clear-cart-on-mount";

type Props = {
  searchParams: Promise<{ order?: string; paid?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order, paid } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-5 pt-36 pb-24 text-center md:px-8">
      <ClearCartOnMount />
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        {paid ? "Payment received" : "Confirmed"}
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Thank you
      </h1>
      <p className="mt-4 text-[#f3efe6]/65">
        Your BODIQO order
        {order ? (
          <>
            {" "}
            <span className="text-[#4a8cff]">{order}</span>
          </>
        ) : null}{" "}
        has been received
        {paid ? " and marked as paid via PayPal" : ""}. We will email shipping
        updates shortly.
      </p>
      <Link
        href="/shop"
        className="mt-10 inline-block rounded-full bg-[#4a8cff] px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase"
      >
        Continue shopping
      </Link>
    </div>
  );
}
