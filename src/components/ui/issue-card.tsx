import { MessageSquare, GitPullRequest } from "lucide-react";

import type { IssueCardData } from "@/lib/data/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const GOOD_FIRST = /^good (first )?issue$/i;
const HELP_WANTED = /^help wanted$/i;

function labelClass(label: string): string {
  if (GOOD_FIRST.test(label)) return "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400/90";
  if (HELP_WANTED.test(label)) return "border-sky-500/20 bg-sky-500/[0.08] text-sky-400/90";
  return "border-white/[0.06] bg-white/[0.04] text-white/40";
}

export function IssueCard({ issue, className }: { issue: IssueCardData; className?: string }) {
  return (
    <a
      href={issue.htmlUrl}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-colors duration-200 hover:bg-white/[0.07] sm:p-5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-[11px] text-white/40">{issue.repoFullName}</span>
          {issue.isPullRequest ? (
            <GitPullRequest className="size-3 shrink-0 text-white/25" aria-hidden />
          ) : null}
        </div>

        <h3 className="mt-1 line-clamp-2 text-sm leading-snug font-medium text-white/90">
          {issue.title}
        </h3>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {issue.labels.slice(0, 4).map((label) => (
            <span
              key={label}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px]",
                labelClass(label),
              )}
            >
              {label}
            </span>
          ))}
        </div>

        <p className="mt-2.5 font-mono text-[10px] text-white/25">
          #{issue.number} · {issue.author ? `opened by ${issue.author} ` : ""}
          {formatRelativeTime(issue.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-white/30">
        <MessageSquare className="size-3" aria-hidden />
        {issue.comments}
      </div>
    </a>
  );
}
