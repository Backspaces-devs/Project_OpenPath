import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface MetricBadgeProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  highlight?: boolean;
  color?: "default" | "emerald" | "amber" | "blue" | "purple";
  className?: string;
}

export function MetricBadge({
  icon: Icon,
  label,
  value,
  color = "default",
  className,
}: MetricBadgeProps) {
  const colorMap = {
    default: "bg-white/[0.04] border-white/10 text-white/70",
    emerald: "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400/90",
    amber: "bg-amber-500/[0.08] border-amber-500/20 text-amber-400/90",
    blue: "bg-sky-500/[0.08] border-sky-500/20 text-sky-400/90",
    purple: "bg-purple-500/[0.08] border-purple-500/20 text-purple-400/90",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
        colorMap[color],
        className
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0 opacity-70" />}
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </span>
  );
}
