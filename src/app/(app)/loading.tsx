import { Skeleton } from "@/components/ui/card";

export default function AppLoading() {
  return (
    <div
      className="page-shell page-stack"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Skeleton className="h-36 w-full rounded-[var(--radius-2xl)]" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-[var(--radius-xl)]" />
        <Skeleton className="h-56 w-full rounded-[var(--radius-xl)]" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-xl)]" />
      </div>
    </div>
  );
}
