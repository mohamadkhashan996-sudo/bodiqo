"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export type AccountLifecycleAction = "deactivate" | "delete";

export function AccountLifecycleModal({
  open,
  action,
  hasPassword,
  twoFactorEnabled,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  action: AccountLifecycleAction | null;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (input: {
    password?: string;
    totpCode?: string;
    confirm: string;
  }) => void;
}) {
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [confirm, setConfirm] = useState("");

  if (!action) return null;

  const isDelete = action === "delete";
  const confirmWord = isDelete ? "DELETE" : "DEACTIVATE";
  const title = isDelete ? "Delete account" : "Deactivate account";
  const confirmReady = confirm === confirmWord;
  const passwordReady = !hasPassword || password.length > 0;
  const totpReady = !twoFactorEnabled || totpCode.trim().length >= 6;
  const canSubmit = confirmReady && passwordReady && totpReady && !busy;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    onConfirm({
      password: hasPassword ? password : undefined,
      totpCode: twoFactorEnabled ? totpCode.trim() : undefined,
      confirm: confirmWord,
    });
  }

  function handleClose() {
    if (busy) return;
    setPassword("");
    setTotpCode("");
    setConfirm("");
    onClose();
  }

  return (
    <Modal open={open} title={title} onClose={handleClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-6 text-[var(--muted-strong)]">
          {isDelete
            ? "This permanently removes your profile, handle, and sign-in methods. Posts are anonymized. This cannot be undone."
            : "Your profile will be hidden and you will be signed out. Contact support to reactivate later."}
        </p>

        {hasPassword ? (
          <label className="block">
            <span className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
              Password
            </span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
              required
            />
          </label>
        ) : null}

        {twoFactorEnabled ? (
          <label className="block">
            <span className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
              Authenticator code
            </span>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="6-digit code"
              className="mt-2"
              required
            />
          </label>
        ) : null}

        {!hasPassword && !twoFactorEnabled ? (
          <p className="rounded-[var(--radius-lg)] border-2 border-[var(--warning)]/40 bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface))] px-3 py-2 text-sm text-[var(--warning)]">
            Set a password or enable two-factor authentication in Security
            before you can continue.
          </p>
        ) : null}

        <label className="block">
          <span className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
            Type {confirmWord} to confirm
          </span>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={confirmWord}
            className="mt-2"
            autoCapitalize="characters"
            required
          />
        </label>

        {error ? (
          <p className="text-sm font-medium text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit || (!hasPassword && !twoFactorEnabled)}
            className={
              isDelete
                ? "border-[var(--danger)] bg-[var(--danger)] text-white hover:opacity-90"
                : undefined
            }
          >
            {busy ? "Working…" : isDelete ? "Delete forever" : "Deactivate"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
