import { cn } from "@/lib/utils";
import { Sparkles, AlertTriangle } from "lucide-react";

interface VibeBadgeProps {
  score: number | null | undefined;
  confidence?: "high" | "low";
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function VibeBadge({
  score,
  confidence = "high",
  size = "md",
  showLabel = true,
}: VibeBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border text-[10px] font-medium bg-white/[0.06] border-white/[0.10] text-white/50",
          size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"
        )}
      >
        <span className="font-mono">--</span>
        {showLabel && <span>Vibe</span>}
      </span>
    );
  }

  let style = "bg-white/[0.06] border-white/[0.10] text-white/50";
  if (score >= 90) {
    style = "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400/90";
  } else if (score >= 75) {
    style = "bg-amber-500/[0.08] border-amber-500/20 text-amber-400/90";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border text-[10px] font-medium transition-colors",
        style,
        size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"
      )}
      title={`Vibe Score: ${Math.round(score)}/100 ${confidence === "low" ? "(Low confidence data)" : ""}`}
    >
      <Sparkles className="size-3 shrink-0" />
      <span className="font-mono font-semibold">{Math.round(score)}</span>
      {showLabel && <span>Vibe</span>}
      {confidence === "low" && (
        <AlertTriangle className="size-3 text-amber-400/80 shrink-0 ml-0.5" />
      )}
    </span>
  );
}
