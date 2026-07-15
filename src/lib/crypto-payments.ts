import QRCode from "qrcode";
import type { CryptoSettings } from "@/lib/settings-schema";

const FIAT_TO_USD: Record<string, number> = {
  USD: 1,
  ILS: 0.27,
  EUR: 1.08,
  GBP: 1.27,
};

const COIN_USD_RATES: Record<string, number> = {
  BTC: 95_000,
  ETH: 3_500,
  USDT: 1,
  USDC: 1,
  SOL: 150,
  BNB: 600,
};

export function findWallet(
  settings: CryptoSettings,
  coin: string,
  network: string,
) {
  const normalizedCoin = coin.toUpperCase();
  const normalizedNetwork = network.trim();
  return settings.wallets.find(
    (w) =>
      w.enabled &&
      w.address &&
      w.coin.toUpperCase() === normalizedCoin &&
      w.network.toLowerCase() === normalizedNetwork.toLowerCase(),
  );
}

export function fiatToUsd(amount: number, currency: string) {
  const rate = FIAT_TO_USD[currency.toUpperCase()] ?? 1;
  return amount * rate;
}

export function computeCryptoAmount(
  total: number,
  currency: string,
  coin: string,
): { amount: number; displayCurrency: string } {
  const usd = fiatToUsd(total, currency);
  const normalizedCoin = coin.toUpperCase();

  if (normalizedCoin === "USDT" || normalizedCoin === "USDC") {
    return { amount: roundCrypto(usd, 2), displayCurrency: "USD" };
  }

  const coinRate = COIN_USD_RATES[normalizedCoin] ?? 1;
  return {
    amount: roundCrypto(usd / coinRate, 8),
    displayCurrency: normalizedCoin,
  };
}

function roundCrypto(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.ceil(value * factor) / factor;
}

export function buildPaymentUri(
  coin: string,
  address: string,
  amount: number,
  network: string,
) {
  const normalized = coin.toUpperCase();
  if (normalized === "BTC") {
    return `bitcoin:${address}?amount=${amount}`;
  }
  if (normalized === "ETH" || normalized === "USDC") {
    return `ethereum:${address}?value=${amount}`;
  }
  return `${normalized} (${network}): ${address} — ${amount}`;
}

export async function generateQrDataUrl(content: string) {
  return QRCode.toDataURL(content, {
    margin: 2,
    width: 280,
    color: { dark: "#4a8cff", light: "#0b0b0b" },
  });
}

export function cryptoExpiresAt(hours = 24) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
