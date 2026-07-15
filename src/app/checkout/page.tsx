import { Suspense } from "react";
import CheckoutClient from "./checkout-client";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 pt-36 text-center text-[#f3efe6]/50">
          Loading checkout…
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
