"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  "Welcome",
  "Admin",
  "Store",
  "PayPal",
  "Finish",
] as const;

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPassword2, setAdminPassword2] = useState("");

  const [storeName, setStoreName] = useState("BODIQO");
  const [storeTagline, setStoreTagline] = useState(
    "Premium marketplace for everyday essentials",
  );
  const [supportEmail, setSupportEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [currency, setCurrency] = useState("ILS");
  const [currencySymbol, setCurrencySymbol] = useState("₪");
  const [language, setLanguage] = useState<"en" | "ar" | "he">("en");

  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalMode, setPaypalMode] = useState<"sandbox" | "live">("sandbox");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalSecret, setPaypalSecret] = useState("");

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.complete) {
          router.replace("/auth/sign-in?callbackUrl=/admin");
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function uploadLogo(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/setup/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setLogoUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function validateStep(): boolean {
    setError(null);
    if (step === 1) {
      if (adminName.trim().length < 2) {
        setError("Enter your name");
        return false;
      }
      if (!adminEmail.includes("@")) {
        setError("Enter a valid admin email");
        return false;
      }
      if (adminPassword.length < 8) {
        setError("Password must be at least 8 characters");
        return false;
      }
      if (adminPassword !== adminPassword2) {
        setError("Passwords do not match");
        return false;
      }
    }
    if (step === 2) {
      if (!storeName.trim()) {
        setError("Store name is required");
        return false;
      }
    }
    if (step === 3 && paypalEnabled) {
      if (!paypalClientId.trim() || !paypalSecret.trim()) {
        setError("PayPal Client ID and Secret are required when enabled");
        return false;
      }
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish(e: FormEvent) {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: {
            name: adminName.trim(),
            email: adminEmail.trim(),
            password: adminPassword,
          },
          store: {
            storeName: storeName.trim(),
            storeTagline: storeTagline.trim(),
            supportEmail: supportEmail.trim() || adminEmail.trim(),
            logoUrl,
            currency,
            currencySymbol,
            language,
          },
          paypal: {
            enabled: paypalEnabled,
            mode: paypalMode,
            businessEmail: paypalEmail.trim(),
            clientId: paypalClientId.trim(),
            clientSecret: paypalSecret.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      router.replace(data.redirectTo || "/auth/sign-in?callbackUrl=/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <p className="text-sm text-[#f3efe6]/55">Checking setup status…</p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={
              i === step
                ? "rounded-full bg-[#4a8cff] px-3 py-1 text-[10px] tracking-[0.14em] text-[#0b0b0b] uppercase"
                : i < step
                  ? "rounded-full border border-[#4a8cff]/40 px-3 py-1 text-[10px] tracking-[0.14em] text-[#4a8cff] uppercase"
                  : "rounded-full border border-white/10 px-3 py-1 text-[10px] tracking-[0.14em] text-[#f3efe6]/35 uppercase"
            }
          >
            {label}
          </span>
        ))}
      </div>

      <form
        onSubmit={finish}
        className="space-y-5 rounded-3xl border border-white/10 bg-[#121212] p-6 md:p-8"
      >
        {step === 0 && (
          <div className="space-y-4">
            <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#f3efe6]">
              Welcome to BODIQO
            </h1>
            <p className="text-sm leading-relaxed text-[#f3efe6]/60">
              First launch setup. Create your admin account, brand the store,
              and connect PayPal. No demo data will be created
              — you start clean for production.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl text-[#f3efe6]">Admin account</h2>
            <Field label="Full name" value={adminName} onChange={setAdminName} />
            <Field
              label="Admin email"
              type="email"
              value={adminEmail}
              onChange={setAdminEmail}
            />
            <Field
              label="Password"
              type="password"
              value={adminPassword}
              onChange={setAdminPassword}
            />
            <Field
              label="Confirm password"
              type="password"
              value={adminPassword2}
              onChange={setAdminPassword2}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl text-[#f3efe6]">Store details</h2>
            <Field label="Store name" value={storeName} onChange={setStoreName} />
            <Field
              label="Tagline"
              value={storeTagline}
              onChange={setStoreTagline}
            />
            <Field
              label="Support email"
              type="email"
              value={supportEmail}
              onChange={setSupportEmail}
              placeholder="Defaults to admin email"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency" value={currency} onChange={setCurrency} />
              <Field
                label="Symbol"
                value={currencySymbol}
                onChange={setCurrencySymbol}
              />
            </div>
            <label className="block text-sm">
              <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
                Language
              </span>
              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as "en" | "ar" | "he")
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="he">עברית</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
                Logo
              </span>
              <input
                type="file"
                accept="image/*"
                className="mt-2 block w-full text-sm text-[#f3efe6]/70"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                }}
              />
              {uploading ? (
                <p className="mt-2 text-xs text-[#4a8cff]">Uploading…</p>
              ) : null}
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="mt-3 h-16 w-auto rounded-lg border border-white/10 object-contain"
                />
              ) : null}
            </label>
            <Field
              label="Or logo URL"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="https://… or /uploads/…"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl text-[#f3efe6]">PayPal</h2>
            <p className="text-sm text-[#f3efe6]/55">
              Optional — you can skip and configure later in Admin → Payments.
            </p>
            <Toggle
              label="Enable PayPal Checkout"
              checked={paypalEnabled}
              onChange={setPaypalEnabled}
            />
            {paypalEnabled ? (
              <>
                <label className="block text-sm">
                  <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
                    Mode
                  </span>
                  <select
                    value={paypalMode}
                    onChange={(e) =>
                      setPaypalMode(e.target.value as "sandbox" | "live")
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="live">Live</option>
                  </select>
                </label>
                <Field
                  label="Business email"
                  value={paypalEmail}
                  onChange={setPaypalEmail}
                />
                <Field
                  label="Client ID"
                  value={paypalClientId}
                  onChange={setPaypalClientId}
                />
                <Field
                  label="Client Secret"
                  type="password"
                  value={paypalSecret}
                  onChange={setPaypalSecret}
                />
              </>
            ) : null}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-2xl text-[#f3efe6]">Ready to launch</h2>
            <ul className="space-y-2 text-sm text-[#f3efe6]/65">
              <li>Admin: {adminEmail || "—"}</li>
              <li>Store: {storeName || "—"}</li>
              <li>PayPal: {paypalEnabled ? "Enabled" : "Skipped"}</li>
            </ul>
            <p className="text-sm text-[#f3efe6]/45">
              Click Finish to create your admin account and open the dashboard.
              Custom catalog and inventory are managed from Admin.
            </p>
          </div>
        )}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || loading}
            className="rounded-full border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.16em] text-[#f3efe6]/70 uppercase disabled:opacity-30"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-[#4a8cff] px-6 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#4a8cff] px-6 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase disabled:opacity-60"
            >
              {loading ? "Saving…" : "Finish setup"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 outline-none focus:border-[#4a8cff]"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-[#f3efe6]/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
