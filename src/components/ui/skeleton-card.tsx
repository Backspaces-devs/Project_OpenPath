export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between gap-3 animate-pulse">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 w-1/2">
            <div className="h-2.5 bg-white/[0.06] rounded-full w-1/3" />
            <div className="h-4 bg-white/[0.08] rounded-full w-3/4" />
          </div>
          <div className="h-5 w-16 bg-white/[0.06] rounded-full" />
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="h-3 bg-white/[0.04] rounded-full w-full" />
          <div className="h-3 bg-white/[0.04] rounded-full w-4/5" />
        </div>

        <div className="flex gap-1.5 pt-1">
          <div className="h-4 w-14 bg-white/[0.04] rounded-full" />
          <div className="h-4 w-12 bg-white/[0.04] rounded-full" />
          <div className="h-4 w-16 bg-white/[0.04] rounded-full" />
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 h-9" />
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
        <div className="flex gap-3">
          <div className="h-3 w-10 bg-white/[0.06] rounded-full" />
          <div className="h-3 w-10 bg-white/[0.06] rounded-full" />
        </div>
        <div className="h-6 w-16 bg-white/[0.08] rounded-full" />
      </div>
    </div>
  );
}
