"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive =
    pathname.startsWith("/shorts") || pathname.startsWith("/messages/");

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(
        "min-w-0 flex-1 overflow-x-hidden md:pb-16 lg:px-10 lg:pb-10 lg:pt-6 xl:px-12",
        immersive
          ? "px-0 pb-[max(5.75rem,calc(4.25rem+env(safe-area-inset-bottom)))] pt-0 sm:px-0 md:px-7"
          : "px-3 pb-[max(5.75rem,calc(4.25rem+env(safe-area-inset-bottom)))] pt-[max(3.75rem,calc(2.75rem+env(safe-area-inset-top)))] sm:px-5 md:px-7",
      )}
    >
      {children}
    </main>
  );
}
