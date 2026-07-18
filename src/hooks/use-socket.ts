"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

let socket: Socket | null = null;

export function useSocket(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    socket ??= io({
      path: "/socket.io",
      withCredentials: true,
      autoConnect: false,
    });
    const client = socket;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    client.on("connect", onConnect);
    client.on("disconnect", onDisconnect);
    client.connect();
    setConnected(client.connected);
    return () => {
      client.off("connect", onConnect);
      client.off("disconnect", onDisconnect);
    };
  }, [enabled]);

  return { socket: enabled ? socket : null, connected };
}
