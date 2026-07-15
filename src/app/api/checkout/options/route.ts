import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";

export async function GET() {
  try {
    const [paypal, stripe] = await Promise.all([
      getSetting(SETTING_KEYS.paypal),
      getSetting(SETTING_KEYS.stripe),
    ]);

    return NextResponse.json({
      paypal: paypal.enabled,
      stripe: stripe.enabled,
      stripePublishableKey: stripe.enabled ? stripe.publishableKey : "",
    });
  } catch {
    return NextResponse.json({
      paypal: false,
      stripe: false,
      stripePublishableKey: "",
    });
  }
}
