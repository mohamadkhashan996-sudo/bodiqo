import Stripe from "stripe";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";

export async function getStripeConfig() {
  return getSetting(SETTING_KEYS.stripe);
}

export async function getStripeClient() {
  const config = await getStripeConfig();
  if (!config.enabled || !config.secretKey) {
    throw new Error(
      "Stripe is not configured. Add credentials in Admin → Payments.",
    );
  }
  return {
    config,
    stripe: new Stripe(config.secretKey),
  };
}

export async function createCheckoutSession(input: {
  orderId: string;
  orderNumber: string;
  email: string;
  total: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  lineItems: { title: string; quantity: number; unitAmount: number }[];
}) {
  const { stripe, config } = await getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    client_reference_id: input.orderId,
    metadata: {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
    },
    line_items: input.lineItems.map((li) => ({
      quantity: li.quantity,
      price_data: {
        currency: input.currency.toLowerCase(),
        unit_amount: Math.round(li.unitAmount * 100),
        product_data: { name: li.title },
      },
    })),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    payment_method_types: ["card"],
    ...(config.applePay || config.googlePay
      ? { payment_method_options: {} }
      : {}),
  });

  return session;
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
) {
  const config = await getStripeConfig();
  if (!config.webhookSecret) {
    throw new Error("Stripe webhook secret is not configured.");
  }
  const { stripe } = await getStripeClient();
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.webhookSecret,
  );
}
