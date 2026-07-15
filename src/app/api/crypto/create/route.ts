import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";
import {
  computeCryptoAmount,
  cryptoExpiresAt,
  findWallet,
} from "@/lib/crypto-payments";

const createSchema = z.object({
  orderId: z.string().min(1),
  coin: z.string().trim().min(1),
  network: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const [crypto, order] = await Promise.all([
      getSetting(SETTING_KEYS.crypto),
      prisma.order.findUnique({ where: { id: parsed.data.orderId } }),
    ]);

    if (!crypto.enabled) {
      return NextResponse.json(
        { error: "Crypto payments are not enabled." },
        { status: 400 },
      );
    }
    if (!order || order.status === "PAID") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const wallet = findWallet(
      crypto,
      parsed.data.coin,
      parsed.data.network,
    );
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not configured for this coin/network." },
        { status: 400 },
      );
    }

    const { amount, displayCurrency } = computeCryptoAmount(
      Number(order.total),
      order.currency,
      parsed.data.coin,
    );

    const existing = await prisma.cryptoPayment.findFirst({
      where: {
        orderId: order.id,
        status: { in: ["WAITING", "CONFIRMING"] },
      },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        id: existing.id,
        coin: existing.coin,
        network: existing.network,
        address: existing.address,
        amount: Number(existing.amount),
        currency: existing.currency,
        status: existing.status,
        expiresAt: existing.expiresAt,
      });
    }

    const payment = await prisma.cryptoPayment.create({
      data: {
        orderId: order.id,
        coin: parsed.data.coin.toUpperCase(),
        network: wallet.network,
        amount,
        currency: displayCurrency,
        address: wallet.address,
        status: "WAITING",
        expiresAt: cryptoExpiresAt(),
      },
    });

    return NextResponse.json({
      ok: true,
      id: payment.id,
      coin: payment.coin,
      network: payment.network,
      address: payment.address,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      expiresAt: payment.expiresAt,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 503 },
    );
  }
}
