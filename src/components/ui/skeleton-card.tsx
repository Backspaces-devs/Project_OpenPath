import { cn } from "@/lib/utils";

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-white/[0.06]", className)} />;
}

/** Loading placeholder that matches the RepoCard geometry exactly. */
export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-4 w-40" />
        </div>
        <SkeletonLine className="h-5 w-16 rounded-full" />
      </div>

      <div className="mt-4 space-y-2">
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-3 w-4/5" />
      </div>

      <div className="mt-4 flex gap-2">
        <SkeletonLine className="h-4 w-16 rounded-full" />
        <SkeletonLine className="h-4 w-12 rounded-full" />
      </div>

      <div className="mt-5 flex items-center gap-4 border-t border-white/[0.06] pt-3">
        <SkeletonLine className="h-3 w-10" />
        <SkeletonLine className="h-3 w-10" />
        <SkeletonLine className="h-3 w-10" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
