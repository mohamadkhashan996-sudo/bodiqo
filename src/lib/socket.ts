import type { Server as HttpServer } from "node:http";
import type { Server as SocketServer } from "socket.io";

declare global {
  var __cirquaIo: SocketServer | undefined;
}

export function setIo(io: SocketServer) {
  globalThis.__cirquaIo = io;
  return io;
}

export function getIo() {
  return globalThis.__cirquaIo;
}

export type SocketServerInstance = SocketServer;
export type SocketHttpServer = HttpServer;
