"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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

export function GuestProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState<string | undefined>();

  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const isGuest = !isAuthenticated;

  const openAuthGate = useCallback((url?: string) => {
    saveBrowseState();
    setCallbackUrl(url);
    setOpen(true);
  }, []);

  const closeAuthGate = useCallback(() => setOpen(false), []);

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
