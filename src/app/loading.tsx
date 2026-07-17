export default function Loading() {
  return (
    <div
      className="mx-auto flex min-h-[40vh] max-w-3xl flex-col justify-center gap-4 px-4 py-16"
      aria-busy="true"
      aria-label="Loading Relune"
    >
      <div className="h-8 w-36 animate-pulse rounded-full bg-[var(--mist)]/70" />
      <div className="h-48 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--mist)]/45" />
      <div className="h-32 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--mist)]/35" />
    </div>
  );
}
