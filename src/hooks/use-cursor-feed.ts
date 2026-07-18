"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { appendUniqueById } from "@/lib/utils";

export type CursorPage<T extends { id: string }> = {
  items: T[];
  nextCursor: string | null;
  error?: string | null;
};

type Options<T extends { id: string }> = {
  /** When this changes, the feed resets and reloads from the start. */
  resetKey?: string;
  fetchPage: (cursor: string | null) => Promise<CursorPage<T>>;
  /** Auto-load first page on mount / resetKey change (default true). */
  autoLoad?: boolean;
};

/**
 * Shared infinite-scroll cursor pagination for list surfaces.
 * Dedupes by `id` on append and guards concurrent loads.
 */
export function useCursorFeed<T extends { id: string }>({
  resetKey = "default",
  fetchPage,
  autoLoad = true,
}: Options<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const load = useCallback(async (after?: string | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (after) setLoadingMore(true);
    else setLoading(true);
    try {
      const page = await fetchRef.current(after ?? null);
      if (page.error) {
        setError(page.error);
        if (!after) setItems([]);
        return;
      }
      setError(null);
      setItems((old) =>
        after ? appendUniqueById(old, page.items) : page.items,
      );
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setError(null);
    if (autoLoad) void load(null);
    else setLoading(false);
  }, [resetKey, autoLoad, load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && cursor && !loadingRef.current) {
        void load(cursor);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, load]);

  return {
    items,
    setItems,
    cursor,
    loading,
    loadingMore,
    error,
    sentinelRef,
    reload: () => load(null),
    loadMore: () => (cursor ? load(cursor) : Promise.resolve()),
  };
}
