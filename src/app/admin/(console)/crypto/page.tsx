import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";
import { CryptoSettingsForm } from "./crypto-form";

export default async function AdminCryptoPage() {
  await requireAdmin();

  const [crypto, payments] = await Promise.all([
    getSetting(SETTING_KEYS.crypto),
    prisma.cryptoPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        order: { select: { orderNumber: true, email: true, total: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] text-[#4a8cff] uppercase">
          Commerce → Crypto
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          Crypto Payments
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Configure wallet addresses and monitor incoming crypto orders.
        </p>
      </div>

      <CryptoSettingsForm initial={crypto} />

      <section className="rounded-2xl border border-white/10">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-[11px] tracking-[0.18em] text-[#f3efe6]/45 uppercase">
            Recent crypto payments
          </h2>
        </div>
        {payments.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#f3efe6]/55">
            No crypto payments yet.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {p.coin} · {p.network}
                  </p>
                  <p className="text-xs text-[#f3efe6]/40">
                    {p.order.orderNumber} · {p.order.email}
                  </p>
                </div>
                <div className="text-right">
                  <p>
                    {String(p.amount)} {p.currency}
                  </p>
                  <p className="text-xs text-[#f3efe6]/40">{p.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
