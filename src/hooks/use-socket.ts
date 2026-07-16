"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket ??= io({ path: "/socket.io", withCredentials: true, autoConnect: false });
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
  }, []);

  return { socket, connected };
}
