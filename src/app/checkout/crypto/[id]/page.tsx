import CryptoCheckoutClient from "./crypto-checkout-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CryptoCheckoutPage({ params }: Props) {
  const { id } = await params;
  return <CryptoCheckoutClient paymentId={id} />;
}
