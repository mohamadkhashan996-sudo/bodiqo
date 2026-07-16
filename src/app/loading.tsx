export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--cloud)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-full border-2 border-[var(--signal)] border-t-transparent" />
        <p className="font-[family-name:var(--font-display)] text-sm tracking-[0.28em] uppercase text-[var(--muted)]">
          Relune
        </p>
      </div>
    </div>
  );
}
