import type { Server as SocketServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __reluneIo: SocketServer | undefined;
}

export function setIo(io: SocketServer) {
  globalThis.__reluneIo = io;
  return io;
}

export function getIo() {
  return globalThis.__reluneIo;
}
