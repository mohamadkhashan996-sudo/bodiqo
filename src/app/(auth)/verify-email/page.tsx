"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
export default function VerifyEmailPage() { const params = useSearchParams(); const [message, setMessage] = useState("Verifying your email…"); useEffect(() => { fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.get("token") }) }).then(r => setMessage(r.ok ? "Email verified. Welcome to Cirqua." : "That verification link is no longer valid.")).catch(() => setMessage("We couldn’t verify that link.")); }, [params]); return <div><h1 className="font-[family-name:var(--font-display)] text-4xl">One last detail</h1><p className="mt-6 rounded-2xl bg-white/60 p-5 text-sm">{message}</p></div>; }
