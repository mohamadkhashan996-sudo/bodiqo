"use client";

import { useEffect } from "react";
import { CallOverlay } from "@/components/calls/call-overlay";
import { useSocket } from "@/hooks/use-socket";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  useEffect(() => {
    const online = () => socket?.emit("presence:update", { status: "ONLINE" });
    const away = () => socket?.emit("presence:update", { status: document.visibilityState === "hidden" ? "AWAY" : "ONLINE" });
    online();
    document.addEventListener("visibilitychange", away);
    window.addEventListener("pagehide", () => socket?.emit("presence:update", { status: "OFFLINE" }));
    return () => document.removeEventListener("visibilitychange", away);
  }, [socket]);
  return <>{children}<CallOverlay /></>;
}
