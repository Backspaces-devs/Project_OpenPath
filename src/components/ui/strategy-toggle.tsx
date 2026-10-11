import Link from "next/link";

import { cn } from "@/lib/utils";

export interface StrategyOption {
  id: string;
  label: string;
  href: string;
  active: boolean;
}

/** Segmented toggle. Server-rendered Links — no client JS needed to switch. */
export function StrategyToggle({ options, className }: { options: StrategyOption[]; className?: string }) {
  return (
    <div
      role="tablist"
      aria-label="Discovery strategy"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1",
        className,
      )}
    >
      {options.map((option) => (
        <Link
          key={option.id}
          href={option.href}
          role="tab"
          aria-selected={option.active}
          scroll={false}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-200",
            option.active ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/5 hover:text-white",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
