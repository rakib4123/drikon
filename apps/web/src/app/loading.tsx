/** Route-level loading state — a glowing brand pulse + shimmer bars. */
export default function Loading() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-2xl bg-drikon-gradient animate-glow-pulse shadow-[0_0_40px_-6px_var(--glow)]" />
          <div className="absolute inset-0 rounded-2xl border border-[color:var(--accent)]/40 animate-ping" />
        </div>
        <div className="w-44 space-y-2">
          <div className="skeleton h-2.5 w-full" />
          <div className="skeleton h-2.5 w-2/3 mx-auto" />
        </div>
      </div>
    </div>
  );
}
