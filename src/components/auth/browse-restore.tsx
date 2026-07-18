"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { clearBrowseState, readBrowseState } from "@/lib/guest/browse-state";

export function BrowseRestore() {
  const pathname = usePathname();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    const state = readBrowseState();
    if (!state) return;

    const targetPath = state.path.split("?")[0];
    if (targetPath !== pathname) return;

    restored.current = true;
    requestAnimationFrame(() => {
      window.scrollTo({
        top: state.scrollY,
        behavior: "instant" as ScrollBehavior,
      });
      if (state.videoId && typeof state.videoTime === "number") {
        const el = document.querySelector<HTMLVideoElement>(
          `[data-video-id="${state.videoId}"]`,
        );
        if (el) {
          el.currentTime = state.videoTime;
          void el.play().catch(() => {});
        }
      }
      clearBrowseState();
    });
  }, [pathname]);

  return null;
}
