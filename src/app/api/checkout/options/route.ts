import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";

export async function GET() {
  try {
    const [paypal, stripe, crypto] = await Promise.all([
      getSetting(SETTING_KEYS.paypal),
      getSetting(SETTING_KEYS.stripe),
      getSetting(SETTING_KEYS.crypto),
    ]);

    const wallets = crypto.wallets
      .filter((w) => w.enabled && w.address)
      .map((w) => ({ coin: w.coin, network: w.network }));

    return NextResponse.json({
      paypal: paypal.enabled,
      stripe: stripe.enabled,
      crypto: crypto.enabled && wallets.length > 0,
      cryptoWallets: wallets,
      stripePublishableKey: stripe.enabled ? stripe.publishableKey : "",
    });
  } catch {
    return NextResponse.json({
      paypal: false,
      stripe: false,
      crypto: false,
      cryptoWallets: [],
      stripePublishableKey: "",
    });
  }
}
