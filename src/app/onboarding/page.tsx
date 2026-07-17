"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { uploadFile } from "@/lib/upload-client";
import type { InterestItem } from "@/types/feed";

const steps = ["Photo", "Identity", "Bio", "Interests", "Preferences"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    displayName: "",
    handle: "",
    bio: "",
    locale: "en",
    theme: "SYSTEM",
    image: "",
  });

  useEffect(() => {
    fetch("/api/interests")
      .then((r) => r.json())
      .then((d) => setInterests(d.interests ?? []))
      .catch(() => {});
  }, []);

  async function pickPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      setForm((prev) => ({ ...prev, image: result.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < steps.length - 1) return setStep(step + 1);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, interestIds: chosen }),
    });
    if (res.ok) {
      router.push("/home");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Could not complete onboarding");
    }
  }

  return (
    <main className="min-h-screen px-5 py-10">
      <form onSubmit={submit} className="mx-auto max-w-3xl">
        <Card className="glass-strong premium-ring rounded-[var(--radius-2xl)] p-7 md:p-8">
          <p className="text-[11px] font-bold tracking-[.2em] text-[var(--signal)] uppercase">
            Relune / {step + 1} of {steps.length}
          </p>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--mist)]">
            <div
              className="h-full bg-[var(--signal)] transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
          <h1 className="mt-7 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            {steps[step]}, in your own words.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            A polished setup flow to shape your profile before you enter the main experience.
          </p>

          {error ? (
            <p className="mt-4 rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          {step === 0 && (
            <div className="surface-subtle mt-6 rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--mist-strong)] p-10 text-center">
              {form.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.image}
                  alt=""
                  className="mx-auto size-28 rounded-[1.5rem] object-cover shadow-[var(--shadow-md)]"
                />
              ) : (
                <div className="mx-auto grid size-28 place-items-center rounded-[1.5rem] bg-[var(--mist)] text-[var(--muted)]">
                  <Camera className="size-8" />
                </div>
              )}
              <p className="mt-4 text-sm text-[var(--muted)]">
                Add a profile photo so people recognize you.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : form.image ? "Change photo" : "Upload photo"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void pickPhoto(file);
                  e.currentTarget.value = "";
                }}
              />
            </div>
          )}
          {step === 1 && (
            <div className="mt-6 space-y-4">
              <Input
                required
                placeholder="Display name"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
              <Input
                required
                placeholder="Handle (e.g. ada)"
                value={form.handle}
                onChange={(e) =>
                  setForm({
                    ...form,
                    handle: e.target.value.toLowerCase().replace(/^@/, ""),
                  })
                }
              />
            </div>
          )}
          {step === 2 && (
            <Textarea
              value={form.bio}
              maxLength={500}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="A small introduction goes a long way."
              className="mt-6 min-h-40"
            />
          )}
          {step === 3 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {interests.map((i) => (
                <button
                  type="button"
                  key={i.id}
                  onClick={() =>
                    setChosen((old) =>
                      old.includes(i.id) ? old.filter((x) => x !== i.id) : [...old, i.id],
                    )
                  }
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    chosen.includes(i.id)
                      ? "bg-[var(--signal)] text-white shadow-[var(--shadow-sm)]"
                      : "surface-panel text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {i.name}
                </button>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="mt-6 grid gap-3">
              <select
                value={form.locale}
                onChange={(e) => setForm({ ...form, locale: e.target.value })}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-4"
              >
                <option value="en">English</option>
              </select>
              <select
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-4"
              >
                <option value="SYSTEM">Match my system</option>
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
              </select>
            </div>
          )}
          <div className="mt-8 flex justify-between">
            {step ? (
              <Button type="button" variant="quiet" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button>{step === steps.length - 1 ? "Enter Relune" : "Continue"}</Button>
          </div>
        </Card>
      </form>
    </main>
  );
}
