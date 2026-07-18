"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive =
    pathname.startsWith("/shorts") ||
    pathname.startsWith("/messages/") ||
    pathname.startsWith("/live/");
  const hideBottomNav =
    pathname.startsWith("/live/") || pathname.startsWith("/messages/");

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(
        "min-w-0 flex-1 overflow-x-hidden lg:px-10 lg:pt-6 lg:pb-10 xl:px-12",
        immersive
          ? cn(
              "px-0 pt-0 sm:px-0 md:px-0 lg:px-10",
              hideBottomNav
                ? "pb-0 lg:pb-10"
                : "pb-[var(--app-bottom-nav)] lg:pb-10",
            )
          : "px-3 pt-[var(--app-top-chrome)] pb-[var(--app-bottom-nav)] sm:px-5 md:px-7 lg:pt-6 lg:pb-10",
      )}
    >
      {children}
    </main>
  );
}
