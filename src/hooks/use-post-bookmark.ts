"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useGuest } from "@/components/auth/guest-provider";

const CHANNEL = "relune:bookmarks";
const OFFLINE_KEY = "relune.bookmarks.queue";

type BookmarkEvent = { postId: string; bookmarked: boolean };
type QueueItem = { postId: string; method: "POST" | "DELETE"; collectionId?: string };

function broadcast(event: BookmarkEvent) {
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage(event);
    bc.close();
  } catch {
    // BroadcastChannel unavailable
  }
}

function readQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueueItem[]) {
  try {
    if (!items.length) localStorage.removeItem(OFFLINE_KEY);
    else localStorage.setItem(OFFLINE_KEY, JSON.stringify(items.slice(-40)));
  } catch {
    // ignore quota
  }
}

function enqueue(item: QueueItem) {
  const next = readQueue().filter((row) => row.postId !== item.postId);
  next.push(item);
  writeQueue(next);
}

async function flushQueue() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const queue = readQueue();
  if (!queue.length) return;
  const remaining: QueueItem[] = [];
  for (const item of queue) {
    try {
      const res = await fetch(`/api/posts/${item.postId}/bookmark`, {
        method: item.method,
        headers:
          item.method === "POST" && item.collectionId
            ? { "Content-Type": "application/json" }
            : undefined,
        body:
          item.method === "POST" && item.collectionId
            ? JSON.stringify({ collectionId: item.collectionId })
            : undefined,
      });
      if (!res.ok) remaining.push(item);
      else {
        broadcast({
          postId: item.postId,
          bookmarked: item.method === "POST",
        });
      }
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
}

/**
 * Optimistic bookmark toggle with multi-tab sync + offline queue.
 */
export function usePostBookmark(
  postId: string,
  initialBookmarked = false,
  onChange?: (bookmarked: boolean) => void,
) {
  const { requireAuth } = useGuest();
  const [bookmarked, setBookmarked] = useState(Boolean(initialBookmarked));
  const [pending, setPending] = useState(false);
  const bookmarkedRef = useRef(bookmarked);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    bookmarkedRef.current = bookmarked;
  }, [bookmarked]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setBookmarked(Boolean(initialBookmarked));
  }, [postId, initialBookmarked]);

  useEffect(() => {
    void flushQueue();
    function onOnline() {
      void flushQueue();
    }
    window.addEventListener("online", onOnline);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = (ev: MessageEvent<BookmarkEvent>) => {
        if (!ev.data || ev.data.postId !== postId) return;
        setBookmarked(Boolean(ev.data.bookmarked));
        onChangeRef.current?.(Boolean(ev.data.bookmarked));
      };
    } catch {
      bc = null;
    }
    return () => {
      window.removeEventListener("online", onOnline);
      bc?.close();
    };
  }, [postId]);

  const apply = useCallback(
    async (next: boolean, collectionId?: string) => {
      if (!requireAuth() || pending) return false;
      const was = bookmarkedRef.current;
      setPending(true);
      setBookmarked(next);
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        enqueue({
          postId,
          method: next ? "POST" : "DELETE",
          collectionId,
        });
        broadcast({ postId, bookmarked: next });
        onChangeRef.current?.(next);
        setPending(false);
        return true;
      }
      try {
        const res = await fetch(`/api/posts/${postId}/bookmark`, {
          method: next ? "POST" : "DELETE",
          headers:
            next && collectionId
              ? { "Content-Type": "application/json" }
              : undefined,
          body:
            next && collectionId
              ? JSON.stringify({ collectionId })
              : undefined,
        });
        if (!res.ok) {
          setBookmarked(was);
          return false;
        }
        broadcast({ postId, bookmarked: next });
        onChangeRef.current?.(next);
        return true;
      } catch {
        enqueue({
          postId,
          method: next ? "POST" : "DELETE",
          collectionId,
        });
        broadcast({ postId, bookmarked: next });
        onChangeRef.current?.(next);
        return true;
      } finally {
        setPending(false);
      }
    },
    [pending, postId, requireAuth],
  );

  const toggle = useCallback(async () => {
    return apply(!bookmarkedRef.current);
  }, [apply]);

  const remove = useCallback(async () => {
    if (!bookmarkedRef.current) return true;
    return apply(false);
  }, [apply]);

  const saveToCollection = useCallback(
    async (collectionId: string) => {
      return apply(true, collectionId);
    },
    [apply],
  );

  return { bookmarked, pending, toggle, remove, saveToCollection };
}
