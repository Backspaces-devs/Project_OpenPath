import { VIBE_COMPONENT_LABELS, VIBE_COMPONENTS, type VibeResult } from "@/lib/scoring/types";
import { cn } from "@/lib/utils";

const BAR_TINTS = [
  "bg-emerald-400/70",
  "bg-amber-400/70",
  "bg-sky-400/70",
  "bg-violet-400/70",
  "bg-rose-400/70",
];

export function VibeBreakdown({ vibe }: { vibe: VibeResult }) {
  return (
    <div className="space-y-4">
      {VIBE_COMPONENTS.map((component, index) => {
        const item = vibe.breakdown[component];
        const missing = item.coverage === 0;
        return (
          <div key={component}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-white/70">{VIBE_COMPONENT_LABELS[component]}</span>
              <span className="font-mono text-xs text-white/50">
                {missing ? "no data" : item.score.toFixed(0)}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn("h-full rounded-full transition-colors duration-200", BAR_TINTS[index])}
                style={{ width: `${missing ? 0 : Math.max(2, item.score)}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-white/25">
              <span>weight {Math.round(item.effectiveWeight * 100)}%</span>
              <span>
                {missing ? "not measured" : `${Math.round(item.coverage * 100)}% of signals`}
              </span>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between border-t border-white/[0.08] pt-3 text-[11px]">
        <span className="text-white/40">Data coverage</span>
        <span className="font-mono text-white/70">{Math.round(vibe.confidence * 100)}%</span>
      </div>
    </div>
  );
}
