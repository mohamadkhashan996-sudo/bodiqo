"use client";

import { type RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const dialogStack: symbol[] = [];
let bodyLockCount = 0;
let bodyOverflowBeforeLock = "";
const hiddenBackground = new Map<
  HTMLElement,
  {
    count: number;
    inert: boolean;
    ariaHidden: string | null;
  }
>();

function registerDialog(id: symbol) {
  dialogStack.push(id);
  return () => {
    const index = dialogStack.lastIndexOf(id);
    if (index >= 0) dialogStack.splice(index, 1);
  };
}

export function isTopDialog(id: symbol) {
  return dialogStack.at(-1) === id;
}

export function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [role='textbox']",
    ),
  );
}

export function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, summary, [contenteditable='true'], [role='button'], [role='link'], [role='menuitem'], [role='option'], [role='tab'], [role='textbox']",
    ),
  );
}

function focusableElements(container: HTMLElement) {
  return [
    ...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ].filter(
    (element) =>
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      !element.closest("[inert]") &&
      element.getClientRects().length > 0,
  );
}

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyLockCount += 1;
  return () => {
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) {
      document.body.style.overflow = bodyOverflowBeforeLock;
    }
  };
}

function hideDialogBackground(container: HTMLElement | null) {
  const root = container?.closest<HTMLElement>("[data-dialog-root]");
  if (!root || root.parentElement !== document.body) return () => undefined;

  const hidden: HTMLElement[] = [];
  for (const element of document.body.children) {
    if (!(element instanceof HTMLElement) || element === root) continue;
    const current = hiddenBackground.get(element);
    if (current) {
      current.count += 1;
    } else {
      hiddenBackground.set(element, {
        count: 1,
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      });
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
    hidden.push(element);
  }

  return () => {
    for (const element of hidden) {
      const current = hiddenBackground.get(element);
      if (!current) continue;
      current.count -= 1;
      if (current.count > 0) continue;
      element.inert = current.inert;
      if (current.ariaHidden == null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", current.ariaHidden);
      hiddenBackground.delete(element);
    }
  };
}

export function useDialogFocus({
  open,
  onClose,
  containerRef,
}: {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const dialogId = useRef(Symbol("dialog"));
  const onCloseRef = useRef(onClose);
  const lastInteractionRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const restoreFocus = () => {
    if (returnFocusRef.current?.isConnected) {
      returnFocusRef.current.focus({ preventScroll: true });
    }
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const rememberPointer = (event: PointerEvent) => {
      if (event.target instanceof Element) {
        lastInteractionRef.current =
          event.target.closest<HTMLElement>(FOCUSABLE_SELECTOR);
      }
    };
    const rememberKeyboard = (event: KeyboardEvent) => {
      if (
        (event.key === "Enter" || event.key === " ") &&
        event.target instanceof HTMLElement
      ) {
        lastInteractionRef.current = event.target;
      }
    };
    document.addEventListener("pointerdown", rememberPointer, true);
    document.addEventListener("keydown", rememberKeyboard, true);
    return () => {
      document.removeEventListener("pointerdown", rememberPointer, true);
      document.removeEventListener("keydown", rememberKeyboard, true);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const id = dialogId.current;
    const containerAtOpen = containerRef.current;
    const interacted = lastInteractionRef.current;
    const active =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previouslyFocused =
      interacted?.isConnected &&
      (!containerAtOpen || !containerAtOpen.contains(interacted))
        ? interacted
        : active && (!containerAtOpen || !containerAtOpen.contains(active))
          ? active
          : null;
    returnFocusRef.current = previouslyFocused;
    const unregister = registerDialog(id);
    const unlockBody = lockBodyScroll();
    const showBackground = hideDialogBackground(containerAtOpen);
    const focusFrame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container || !isTopDialog(id)) return;
      if (container.contains(document.activeElement)) return;
      const preferred = container.querySelector<HTMLElement>(
        "[data-autofocus], [autofocus]",
      );
      (preferred ?? focusableElements(container)[0] ?? container).focus({
        preventScroll: true,
      });
    });

    function onKeyDown(event: KeyboardEvent) {
      if (!isTopDialog(id) || event.isComposing) return;
      const container = containerRef.current;
      if (!container) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const nodes = focusableElements(container);
      if (!nodes.length) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (
        !event.shiftKey &&
        (active === last || !container.contains(active))
      ) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      unregister();
      unlockBody();
      showBackground();
      const container = containerRef.current;
      const restoreFocus = () => {
        const active = document.activeElement;
        const focusIsUnclaimed =
          active === document.body ||
          active === document.documentElement ||
          (container ? container.contains(active) : false);
        if (previouslyFocused?.isConnected && focusIsUnclaimed) {
          previouslyFocused.focus({ preventScroll: true });
        }
      };
      window.requestAnimationFrame(restoreFocus);
      // AnimatePresence can keep a closing panel mounted briefly. Restore once
      // more after its exit transition if removal returned focus to <body>.
      window.setTimeout(restoreFocus, 350);
    };
  }, [open, containerRef]);

  return { dialogId: dialogId.current, restoreFocus };
}
