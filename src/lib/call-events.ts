/** Typed bridge between invite UIs and CallOverlay. */

export const CALL_START_EVENT = "relune:call-start";

export function dispatchCallStart(call: unknown) {
  if (typeof window === "undefined" || call == null) return;
  window.dispatchEvent(new CustomEvent(CALL_START_EVENT, { detail: call }));
}

export function onCallStart(handler: (call: unknown) => void) {
  const listener = (event: Event) => {
    handler((event as CustomEvent).detail);
  };
  window.addEventListener(CALL_START_EVENT, listener);
  return () => window.removeEventListener(CALL_START_EVENT, listener);
}
