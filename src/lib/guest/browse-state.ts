export type BrowseState = {
  path: string;
  scrollY: number;
  videoId?: string;
  videoTime?: number;
  savedAt: number;
};

const KEY = "relune.browseState";

export function saveBrowseState(
  partial?: Partial<Omit<BrowseState, "savedAt" | "path">>,
) {
  if (typeof window === "undefined") return;
  const state: BrowseState = {
    path: window.location.pathname + window.location.search,
    scrollY: window.scrollY,
    savedAt: Date.now(),
    ...partial,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function readBrowseState(): BrowseState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowseState;
    if (Date.now() - parsed.savedAt > 30 * 60_000) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearBrowseState() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
