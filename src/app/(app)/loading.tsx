export default function AppLoading() {
  return (
    <div
      className="mx-auto max-w-3xl space-y-4 px-1 py-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-10 w-40 animate-pulse rounded-full bg-[var(--mist)]/70" />
      <div className="h-56 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--mist)]/50" />
      <div className="h-40 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--mist)]/40" />
    </div>
  );
}
