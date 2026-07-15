"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/catalog-types";

type PaymentStatus = {
  id: string;
  coin: string;
  network: string;
  address: string;
  amount: number;
  currency: string;
  status: string;
  txid?: string | null;
  expiresAt?: string | null;
  order?: {
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
  };
};

export default function CryptoCheckoutPage({
  paymentId,
}: {
  paymentId: string;
}) {
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/crypto/${paymentId}`);
        const data = await res.json();
        if (!res.ok) {
          if (active) setError(data.error || "Payment not found");
          return;
        }
        if (!active) return;
        setPayment(data);

        const QRCode = (await import("qrcode")).default;
        const uri = `${data.coin}:${data.address}?amount=${data.amount}`;
        const url = await QRCode.toDataURL(uri, {
          margin: 2,
          width: 280,
          color: { dark: "#4a8cff", light: "#0b0b0b" },
        });
        if (active) setQrUrl(url);
      } catch {
        if (active) setError("Failed to load payment details.");
      }
    }

    load();
    const interval = window.setInterval(load, 12_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [paymentId]);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2000);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-5 pt-36 pb-24 text-center">
        <p className="text-red-200">{error}</p>
        <Link href="/checkout" className="mt-6 inline-block text-[#4a8cff]">
          Back to checkout
        </Link>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="mx-auto max-w-lg px-5 pt-36 pb-24 text-center text-[#f3efe6]/55">
        Loading payment…
      </div>
    );
  }

  const confirmed =
    payment.status === "CONFIRMED" || payment.order?.status === "PAID";

  return (
    <div className="mx-auto max-w-lg px-5 pt-28 pb-24 md:pt-36">
      <p className="text-[11px] tracking-[0.2em] text-[#4a8cff] uppercase">
        Crypto payment
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[#f3efe6]">
        Send {payment.coin}
      </h1>
      <p className="mt-2 text-sm text-[#f3efe6]/55">
        Order {payment.order?.orderNumber} · {payment.network}
      </p>

      <div className="mt-10 rounded-3xl border border-white/10 bg-[#101010] p-6">
        <StatusBadge status={payment.status} confirmed={confirmed} />

        {qrUrl && !confirmed ? (
          <div className="mx-auto mt-6 w-fit overflow-hidden rounded-2xl bg-[#0b0b0b] p-4">
            <Image src={qrUrl} alt="Payment QR" width={280} height={280} />
          </div>
        ) : null}

        <dl className="mt-8 space-y-4 text-sm">
          <Row label="Amount">
            <span className="font-mono text-[#f3efe6]">
              {payment.amount} {payment.currency}
            </span>
            {payment.order ? (
              <span className="ms-2 text-[#f3efe6]/45">
                (≈ {formatPrice(payment.order.total, payment.order.currency)})
              </span>
            ) : null}
          </Row>
          <Row label="Network">{payment.network}</Row>
          <Row label="Address">
            <code className="break-all text-xs text-[#f3efe6]/85">
              {payment.address}
            </code>
            <button
              type="button"
              onClick={() => copy(payment.address, "address")}
              className="ms-2 text-[11px] tracking-[0.12em] text-[#4a8cff] uppercase"
            >
              {copied === "address" ? "Copied" : "Copy"}
            </button>
          </Row>
          {payment.txid ? (
            <Row label="TxID">
              <code className="break-all text-xs text-[#8fdfb0]">
                {payment.txid}
              </code>
            </Row>
          ) : null}
        </dl>

        {payment.expiresAt && payment.status === "WAITING" ? (
          <p className="mt-6 text-xs text-[#f3efe6]/45">
            Expires {new Date(payment.expiresAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {confirmed ? (
        <Link
          href={`/checkout/success?order=${payment.order?.orderNumber}&paid=1`}
          className="mt-8 block rounded-full bg-[#4a8cff] px-8 py-3.5 text-center text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase"
        >
          View order confirmation
        </Link>
      ) : (
        <p className="mt-8 text-center text-sm text-[#f3efe6]/45">
          Send the exact amount to the address above. Status updates automatically.
        </p>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  confirmed,
}: {
  status: string;
  confirmed: boolean;
}) {
  const label = confirmed ? "Confirmed" : status.replace(/_/g, " ");
  const color = confirmed
    ? "text-[#8fdfb0] border-[#8fdfb0]/30"
    : status === "EXPIRED" || status === "FAILED"
      ? "text-red-300 border-red-400/30"
      : "text-[#4a8cff] border-[#4a8cff]/30";

  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-[11px] tracking-[0.16em] uppercase ${color}`}
    >
      {label}
    </span>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
