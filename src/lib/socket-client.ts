import type { Socket } from "socket.io-client";

export type SocketAck<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

/** Promise wrapper around Socket.IO ack callbacks used across calls/messaging. */
export function emitAck<T = unknown>(
  socket: Socket,
  event: string,
  payload: unknown,
): Promise<SocketAck<T>> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (result: SocketAck<T>) => {
      resolve(result ?? { ok: false, error: "No response" });
    });
  });
}
