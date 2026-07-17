"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { AuthGateModal } from "@/components/auth/auth-gate-modal";
import { saveBrowseState } from "@/lib/guest/browse-state";

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
      <AuthGateModal open={open} onClose={closeAuthGate} callbackUrl={callbackUrl} />
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuest must be used within GuestProvider");
  return ctx;
}
