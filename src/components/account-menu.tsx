"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { User } from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { data: session, status } = useSession();
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const signedIn = status === "authenticated" && Boolean(session?.user);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={t("header.account")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center text-[var(--foreground)]/80 transition hover:text-[var(--accent)]",
          open && "text-[var(--accent)]",
        )}
      >
        <User size={18} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-[calc(100%+0.65rem)] z-50 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_var(--shadow)]"
        >
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
              {t("header.account")}
            </p>
            {signedIn ? (
              <p className="mt-1 truncate text-sm text-[var(--foreground)]">
                {session?.user?.email || session?.user?.name}
              </p>
            ) : (
              <p className="mt-1 text-sm text-[var(--foreground)]/70">
                {t("account.welcomeGuest")}
              </p>
            )}
          </div>

          <ul className="py-2 text-sm">
            {signedIn ? (
              <>
                <li>
                  <Link
                    role="menuitem"
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-[var(--foreground)]/85 transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  >
                    {t("account.myAccount")}
                  </Link>
                </li>
                <li>
                  <Link
                    role="menuitem"
                    href="/wishlist"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-[var(--foreground)]/85 transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  >
                    {t("header.wishlist")}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      void signOut({ callbackUrl: "/" });
                    }}
                    className="block w-full px-4 py-2.5 text-start text-[var(--foreground)]/85 transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  >
                    {t("account.signOut")}
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    role="menuitem"
                    href="/auth/sign-in"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-[var(--foreground)]/85 transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  >
                    {t("account.signIn")}
                  </Link>
                </li>
                <li>
                  <Link
                    role="menuitem"
                    href="/auth/sign-up"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-[var(--foreground)]/85 transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  >
                    {t("account.create")}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="block w-full px-4 py-2.5 text-start text-[var(--foreground)]/85 transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  >
                    {t("account.continueGuest")}
                  </button>
                </li>
                <li>
                  <Link
                    role="menuitem"
                    href="/auth/forgot-password"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-[var(--foreground)]/85 transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                  >
                    {t("account.forgot")}
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
