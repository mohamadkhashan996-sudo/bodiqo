import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";

type PaypalToken = {
  access_token: string;
  expires_in: number;
};

let cachedToken: { token: string; expiresAt: number; mode: string } | null =
  null;

function apiBase(mode: "sandbox" | "live") {
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPaypalConfig() {
  return getSetting(SETTING_KEYS.paypal);
}

async function getAccessToken() {
  const config = await getPaypalConfig();
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    throw new Error(
      "PayPal is not configured. Add credentials in Admin → Settings.",
    );
  }

  if (
    cachedToken &&
    cachedToken.mode === config.mode &&
    cachedToken.expiresAt > Date.now() + 60_000
  ) {
    return { token: cachedToken.token, config };
  }

  const auth = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
  ).toString("base64");

  const res = await fetch(`${apiBase(config.mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(
      "Failed to authenticate with PayPal. Check your credentials.",
    );
  }

  const data = (await res.json()) as PaypalToken;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    mode: config.mode,
  };

  return { token: data.access_token, config };
}

export async function createPaypalOrder(input: {
  orderNumber: string;
  total: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const { token, config } = await getAccessToken();

  const res = await fetch(`${apiBase(config.mode)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderNumber,
          description: `BODIQO order ${input.orderNumber}`,
          amount: {
            currency_code: input.currency,
            value: input.total.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: config.brandName || "BODIQO",
        shipping_preference: "SET_PROVIDED_ADDRESS",
        user_action: "PAY_NOW",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal create order failed: ${err}`);
  }

  return res.json() as Promise<{
    id: string;
    status: string;
    links: { rel: string; href: string }[];
  }>;
}

export async function capturePaypalOrder(paypalOrderId: string) {
  const { token, config } = await getAccessToken();

  const res = await fetch(
    `${apiBase(config.mode)}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture failed: ${err}`);
  }

  return res.json() as Promise<{
    id: string;
    status: string;
    purchase_units?: {
      payments?: {
        captures?: { id: string; status: string }[];
      };
    }[];
  }>;
}

export function getPaypalApproveLink(links: { rel: string; href: string }[]) {
  return links.find((l) => l.rel === "approve")?.href;
}
