import { Info, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type NoticeTone = "info" | "warning";

const TONES: Record<NoticeTone, { wrapper: string; icon: LucideIcon; iconClass: string }> = {
  info: {
    wrapper: "border-sky-500/20 bg-sky-500/[0.06] text-sky-200/80",
    icon: Info,
    iconClass: "text-sky-400/80",
  },
  warning: {
    wrapper: "border-amber-500/20 bg-amber-500/[0.06] text-amber-200/80",
    icon: TriangleAlert,
    iconClass: "text-amber-400/80",
  },
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { wrapper, icon: Icon, iconClass } = TONES[tone];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur-md",
        wrapper,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconClass)} aria-hidden />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <p className="leading-relaxed text-white/50">{children}</p> : null}
      </div>
    </div>
  );
}
