import { cn } from "@/lib/utils";
import type { VibeGrade } from "@/lib/scoring/types";

export type VibeBadgeSize = "sm" | "md" | "lg";

const TINTS: Record<VibeGrade, string> = {
  exceptional: "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400/90",
  strong: "bg-amber-500/[0.08] border-amber-500/20 text-amber-400/90",
  promising: "bg-sky-500/[0.08] border-sky-500/20 text-sky-400/90",
  quiet: "bg-white/[0.06] border-white/[0.10] text-white/50",
};

const SIZES: Record<VibeBadgeSize, string> = {
  sm: "gap-1 px-1.5 py-0.5 text-[10px]",
  md: "gap-1.5 px-2 py-0.5 text-[11px]",
  lg: "gap-2 px-2.5 py-1 text-xs",
};

const NUMBERS: Record<VibeBadgeSize, string> = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
};

export interface VibeBadgeProps {
  score: number;
  grade?: VibeGrade;
  confidence?: number | null;
  size?: VibeBadgeSize;
  showLabel?: boolean;
  className?: string;
}

/**
 * The Vibe Score pill. Band colours are muted tints on purpose — nothing in this
 * design system uses a saturated fill except the primary button.
 */
export function VibeBadge({
  score,
  grade,
  confidence,
  size = "md",
  showLabel = true,
  className,
}: VibeBadgeProps) {
  const band: VibeGrade =
    grade ?? (score >= 90 ? "exceptional" : score >= 75 ? "strong" : score >= 60 ? "promising" : "quiet");
  const rounded = Math.round(score);

  return (
    <span
      title={
        confidence === null || confidence === undefined
          ? `Vibe Score ${rounded}/100`
          : `Vibe Score ${rounded}/100 · ${Math.round(confidence * 100)}% data coverage`
      }
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border font-medium tabular-nums transition-colors duration-200",
        TINTS[band],
        SIZES[size],
        className,
      )}
    >
      {showLabel ? (
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-70">vibe</span>
      ) : null}
      <span className={cn("font-mono leading-none", NUMBERS[size])}>{rounded}</span>
      {confidence !== null && confidence !== undefined && confidence < 0.5 ? (
        <span
          aria-hidden
          className="size-1 rounded-full bg-current opacity-40"
          title="Estimated from partial data"
        />
      ) : null}
    </span>
  );
}
