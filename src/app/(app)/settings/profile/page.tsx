"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Camera, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageTransition } from "@/components/motion/primitives";
import { StateBanner } from "@/components/ui/card";
import { uploadFile } from "@/lib/upload-client";

type ProfileForm = {
  displayName: string;
  handle: string;
  bio: string;
  website: string;
  city: string;
  country: string;
  image: string;
  coverImage: string;
  isPrivate: boolean;
};

const emptyForm: ProfileForm = {
  displayName: "",
  handle: "",
  bio: "",
  website: "",
  city: "",
  country: "",
  image: "",
  coverImage: "",
  isPrivate: false,
};

export default function ProfileSettingsPage() {
  const { update: updateSession } = useSession();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"image" | "coverImage" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        const user = data.user;
        if (!user) return;
        setForm({
          displayName: user.displayName ?? user.name ?? "",
          handle: user.handle ?? "",
          bio: user.bio ?? "",
          website: user.website ?? "",
          city: user.city ?? "",
          country: user.country ?? "",
          image: user.image ?? "",
          coverImage: user.coverImage ?? "",
          isPrivate: Boolean(user.isPrivate),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function upload(kind: "image" | "coverImage", file: File) {
    setError(null);
    setUploading(kind);
    try {
      const result = await uploadFile(file);
      setForm((prev) => ({ ...prev, [kind]: result.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const handle = form.handle.trim().replace(/^@+/, "").toLowerCase();
    if (!/^[a-z0-9_.]{3,24}$/.test(handle)) {
      setError("Username must be 3–24 characters (letters, numbers, _ or .).");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName.trim(),
        handle,
        bio: form.bio,
        website: form.website.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        image: form.image || null,
        coverImage: form.coverImage || null,
        isPrivate: form.isPrivate,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save profile");
      return;
    }
    setForm((prev) => ({
      ...prev,
      handle: data.user?.handle ?? handle,
      displayName: data.user?.displayName ?? prev.displayName,
      image: data.user?.image ?? "",
      coverImage: data.user?.coverImage ?? "",
    }));
    await updateSession({
      handle: data.user?.handle,
      image: data.user?.image,
      name: data.user?.displayName ?? data.user?.name,
    }).catch(() => undefined);
    setMessage("Profile updated.");
  }

  return (
    <PageTransition className="page-shell max-w-3xl">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Back to settings
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Edit profile
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Avatar, cover, username, bio, and how your account appears to others.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div
          className="relative h-44 bg-gradient-to-br from-[var(--signal)]/50 to-[var(--ember)]/40"
          style={
            form.coverImage
              ? {
                  backgroundImage: `url(${form.coverImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="absolute bottom-4 right-4 flex gap-2">
            {form.coverImage ? (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, coverImage: "" }))}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-2 text-sm font-medium shadow-[var(--shadow-sm)]"
              >
                <Trash2 className="size-4" />
                Remove
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={uploading === "coverImage"}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-4 py-2 text-sm font-medium shadow-[var(--shadow-sm)] disabled:opacity-60"
            >
              <ImageIcon className="size-4" />
              {uploading === "coverImage" ? "Uploading…" : "Change cover"}
            </button>
          </div>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload("coverImage", file);
              e.currentTarget.value = "";
            }}
          />
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative -mt-12">
              {form.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.image}
                  alt=""
                  className="size-24 rounded-[1.5rem] border-4 border-[var(--surface)] object-cover shadow-[var(--shadow-md)]"
                />
              ) : (
                <div className="grid size-24 place-items-center rounded-[1.5rem] border-4 border-[var(--surface)] bg-[var(--mist)] text-2xl font-semibold shadow-[var(--shadow-md)]">
                  {form.displayName.slice(0, 1).toUpperCase() || "R"}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                disabled={uploading === "image"}
                className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full bg-[var(--ink)] text-[var(--cloud)] disabled:opacity-60"
                aria-label="Change avatar"
              >
                <Camera className="size-4" />
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload("image", file);
                  e.currentTarget.value = "";
                }}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-[var(--muted)]">@{form.handle || "username"}</p>
              {form.image ? (
                <button
                  type="button"
                  className="text-sm text-[var(--danger)] hover:underline"
                  onClick={() => setForm((prev) => ({ ...prev, image: "" }))}
                >
                  Remove avatar
                </button>
              ) : null}
              {form.handle ? (
                <Link
                  href={`/u/${form.handle}`}
                  className="block text-sm font-semibold text-[var(--signal)]"
                >
                  View public profile
                </Link>
              ) : null}
            </div>
          </div>

          {error ? <StateBanner tone="error">{error}</StateBanner> : null}
          {message ? <StateBanner tone="success">{message}</StateBanner> : null}

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Display name
            </span>
            <Input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Display name"
              disabled={loading}
              className="mt-2"
              maxLength={80}
              required
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Username
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">@</span>
              <Input
                value={form.handle}
                onChange={(e) =>
                  setForm({
                    ...form,
                    handle: e.target.value.replace(/^@+/, "").toLowerCase(),
                  })
                }
                placeholder="username"
                disabled={loading}
                autoComplete="username"
                minLength={3}
                maxLength={24}
                pattern="[a-z0-9_.]{3,24}"
                required
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              3–24 characters. Letters, numbers, underscore, and period only.
            </p>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Bio
            </span>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell people a little about you"
              className="mt-2 min-h-32"
              maxLength={500}
              disabled={loading}
            />
            <p className="mt-2 text-xs text-[var(--muted)]">{form.bio.length}/500</p>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Website
            </span>
            <Input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://"
              disabled={loading}
              className="mt-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                City
              </span>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                disabled={loading}
                className="mt-2"
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Country
              </span>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Country"
                disabled={loading}
                className="mt-2"
              />
            </label>
          </div>

          <div className="rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.isPrivate}
                onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
                className="mt-1 size-4 rounded border-2 border-[var(--mist-strong)] accent-[var(--signal-deep)]"
              />
              <span>
                <span className="font-medium">Private account</span>
                <span className="mt-1 block text-[var(--muted)]">
                  Only approved followers can see your posts, media, and follower lists.
                  Your avatar, name, username, and bio stay visible.
                </span>
              </span>
            </label>
            <Link
              href="/settings/privacy"
              className="mt-3 inline-block text-sm text-[var(--signal-deep)] hover:underline"
            >
              More privacy settings →
            </Link>
          </div>

          <Button type="submit" disabled={saving || loading || Boolean(uploading)}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Card>
    </PageTransition>
  );
}
