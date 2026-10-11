"use client";

import { cn } from "@/lib/utils";
import { type DiscoveryStrategy } from "@/lib/discovery/types";
import { DISCOVERY_STRATEGIES } from "@/lib/discovery/strategies";

interface StrategyToggleProps {
  currentStrategy: DiscoveryStrategy;
  onSelect: (strategy: DiscoveryStrategy) => void;
}

export function StrategyToggle({
  currentStrategy,
  onSelect,
}: StrategyToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 w-fit overflow-x-auto max-w-full">
      {DISCOVERY_STRATEGIES.map((item) => {
        const isActive = currentStrategy === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-white/15 text-white shadow-none"
                : "text-white/50 hover:text-white"
            )}
            title={item.description}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
