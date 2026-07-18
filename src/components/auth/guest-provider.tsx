"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

import { saveBrowseState } from "@/lib/guest/browse-state";

const AuthGateModal = dynamic(
  () =>
    import("@/components/auth/auth-gate-modal").then((m) => m.AuthGateModal),
  { ssr: false },
);

type GuestContextValue = {
  isGuest: boolean;
  isAuthenticated: boolean;
  requireAuth: (action?: () => void) => boolean;
  openAuthGate: (callbackUrl?: string) => void;
  closeAuthGate: () => void;
};

const GuestContext = createContext<GuestContextValue | null>(null);

/** Ignore reopen attempts briefly after dismiss (click-through / focus restore). */
const REOPEN_COOLDOWN_MS = 500;

export function GuestProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState<string | undefined>();
  const closedAt = useRef(0);

  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const isGuest = !isAuthenticated;

  const closeAuthGate = useCallback(() => {
    closedAt.current = Date.now();
    setOpen(false);
    setCallbackUrl(undefined);
    // Drop focus so gated controls don't immediately re-open the gate.
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
  }, []);

  const openAuthGate = useCallback((url?: string) => {
    if (Date.now() - closedAt.current < REOPEN_COOLDOWN_MS) return;
    saveBrowseState();
    setCallbackUrl(url);
    setOpen(true);
  }, []);

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (isAuthenticated) {
        action?.();
        return true;
      }
      openAuthGate();
      return false;
    },
    [isAuthenticated, openAuthGate],
  );

  useEffect(() => {
    if (isAuthenticated) setOpen(false);
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      isGuest,
      isAuthenticated,
      requireAuth,
      openAuthGate,
      closeAuthGate,
    }),
    [isGuest, isAuthenticated, requireAuth, openAuthGate, closeAuthGate],
  );

  return (
    <GuestContext.Provider value={value}>
      {children}
      {open ? (
        <AuthGateModal
          open={open}
          onClose={closeAuthGate}
          callbackUrl={callbackUrl}
        />
      ) : null}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuest must be used within GuestProvider");
  return ctx;
}
