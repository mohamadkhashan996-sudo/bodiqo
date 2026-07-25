import type { Server as SocketServer } from "socket.io";

declare global {
  var __reluneIo: SocketServer | undefined;
  var __reluneActiveChats: Map<string, Set<string>> | undefined;
  var __reluneLiveViewers: Map<string, Map<string, Set<string>>> | undefined;
}

export function setIo(io: SocketServer) {
  globalThis.__reluneIo = io;
  return io;
}

export function getIo() {
  return globalThis.__reluneIo;
}

/** Disconnect authenticated sockets locally and across the Redis adapter. */
export function disconnectUserSockets(userId: string) {
  const io = getIo();
  io?.in(`user:${userId}`).disconnectSockets(true);
  io?.in(`impersonator:${userId}`).disconnectSockets(true);
}

/** Disconnect one or more device sessions without ending the user's others. */
export function disconnectDeviceSockets(sessionKeys: string[]) {
  const io = getIo();
  if (!io) return;
  for (const sessionKey of sessionKeys.filter(Boolean)) {
    io.in(`session:${sessionKey}`).disconnectSockets(true);
  }
}

/** Users currently viewing a conversation thread (not merely room members). */
function activeChats() {
  if (!globalThis.__reluneActiveChats) {
    globalThis.__reluneActiveChats = new Map();
  }
  return globalThis.__reluneActiveChats;
}

export function markChatActive(conversationId: string, userId: string) {
  const map = activeChats();
  const set = map.get(conversationId) ?? new Set<string>();
  set.add(userId);
  map.set(conversationId, set);
}

export function markChatInactive(conversationId: string, userId: string) {
  const map = activeChats();
  const set = map.get(conversationId);
  if (!set) return;
  set.delete(userId);
  if (!set.size) map.delete(conversationId);
}

export function clearUserActiveChats(userId: string) {
  const map = activeChats();
  for (const [conversationId, set] of map) {
    if (set.delete(userId) && !set.size) map.delete(conversationId);
  }
}

export function usersViewingConversation(conversationId: string) {
  return activeChats().get(conversationId) ?? new Set<string>();
}

/** Live session viewers: sessionId → userId → socketIds */
function liveViewers() {
  if (!globalThis.__reluneLiveViewers) {
    globalThis.__reluneLiveViewers = new Map();
  }
  return globalThis.__reluneLiveViewers;
}

export function addLiveViewer(
  sessionId: string,
  userId: string,
  socketId: string,
) {
  const sessions = liveViewers();
  const users = sessions.get(sessionId) ?? new Map<string, Set<string>>();
  const sockets = users.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  users.set(userId, sockets);
  sessions.set(sessionId, users);
  return users.size;
}

export function removeLiveViewer(
  sessionId: string,
  userId: string,
  socketId: string,
) {
  const sessions = liveViewers();
  const users = sessions.get(sessionId);
  if (!users) return 0;
  const sockets = users.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (!sockets.size) users.delete(userId);
  }
  if (!users.size) sessions.delete(sessionId);
  return users.size;
}

export function clearSocketLiveViewers(userId: string, socketId: string) {
  const sessions = liveViewers();
  const affected: Array<{ sessionId: string; count: number }> = [];
  for (const [sessionId, users] of sessions) {
    const sockets = users.get(userId);
    if (!sockets?.has(socketId)) continue;
    sockets.delete(socketId);
    if (!sockets.size) users.delete(userId);
    if (!users.size) sessions.delete(sessionId);
    affected.push({ sessionId, count: users.size });
  }
  // Best-effort Redis sync (async, non-blocking for disconnect path)
  if (affected.length) {
    void (async () => {
      try {
        const { getRedis } = await import("@/lib/redis");
        const redis = await getRedis();
        if (!redis) return;
        for (const row of affected) {
          const still = isLiveViewer(row.sessionId, userId);
          if (!still) await redis.sRem(`live:viewers:${row.sessionId}`, userId);
          row.count =
            Number(await redis.sCard(`live:viewers:${row.sessionId}`)) ||
            row.count;
        }
      } catch {
        /* ignore */
      }
    })();
  }
  return affected;
}

export function isLiveViewer(sessionId: string, userId: string) {
  return Boolean(liveViewers().get(sessionId)?.has(userId));
}

/** Prefer Redis set cardinality when available (multi-node safe). */
export async function resolveLiveViewerCount(
  sessionId: string,
  localCount: number,
) {
  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = await getRedis();
    if (!redis) return localCount;
    const key = `live:viewers:${sessionId}`;
    const users = liveViewers().get(sessionId);
    if (users) {
      if (users.size) await redis.sAdd(key, [...users.keys()]);
      else await redis.del(key);
    }
    const count = await redis.sCard(key);
    return Number(count) || localCount;
  } catch {
    return localCount;
  }
}

export async function trackLiveViewerJoin(
  sessionId: string,
  userId: string,
  socketId: string,
) {
  const local = addLiveViewer(sessionId, userId, socketId);
  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = await getRedis();
    if (redis) {
      await redis.sAdd(`live:viewers:${sessionId}`, userId);
      return Number(await redis.sCard(`live:viewers:${sessionId}`)) || local;
    }
  } catch {
    /* fall through */
  }
  return local;
}

export async function trackLiveViewerLeave(
  sessionId: string,
  userId: string,
  socketId: string,
) {
  const local = removeLiveViewer(sessionId, userId, socketId);
  const stillHere = isLiveViewer(sessionId, userId);
  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = await getRedis();
    if (redis) {
      const key = `live:viewers:${sessionId}`;
      if (!stillHere) await redis.sRem(key, userId);
      return Number(await redis.sCard(key)) || local;
    }
  } catch {
    /* fall through */
  }
  return local;
}
