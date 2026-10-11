import { CircleDot, Clock, GitFork, Star } from "lucide-react";
import Link from "next/link";

import { SaveButton } from "@/components/ui/save-button";
import { VibeBadge } from "@/components/ui/vibe-badge";
import type { RepoCardData } from "@/lib/data/types";
import { cn, formatCompactNumber, formatRelativeTime } from "@/lib/utils";

export interface RepoCardProps {
  repo: RepoCardData;
  className?: string;
}

export function RepoCard({ repo, className }: RepoCardProps) {
  return (
    // The whole card is one link; the save button floats above it so the markup
    // stays valid (a <button> may not live inside an <a>).
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-colors duration-200 hover:bg-white/[0.07] sm:p-5",
        className,
      )}
    >
      <Link
        href={`/discover/${repo.fullName}`}
        aria-label={`Open ${repo.fullName}`}
        className="absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-brand/50"
      />

        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[11px] text-white/40">{repo.owner}</p>
            <h3 className="mt-0.5 truncate text-[15px] leading-snug font-semibold text-white/90">
              {repo.name}
            </h3>
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-1">
            <SaveButton fullName={repo.fullName} />
            <VibeBadge score={repo.vibe.score} confidence={repo.vibe.confidence} />
          </div>
        </header>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/60">
          {repo.description ?? "No description provided."}
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {repo.language ? (
            <span className="rounded-full border border-white/[0.06] bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/70">
              {repo.language}
            </span>
          ) : null}
          {repo.license ? (
            <span className="rounded-full border border-white/[0.06] bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
              {repo.license}
            </span>
          ) : null}
          {repo.goodFirstIssues !== null && repo.goodFirstIssues > 0 ? (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] text-emerald-400/90">
              {repo.goodFirstIssues} good first issue{repo.goodFirstIssues === 1 ? "" : "s"}
            </span>
          ) : null}
          {repo.topics.slice(0, 2).map((topic) => (
            <span
              key={topic}
              className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40"
            >
              {topic}
            </span>
          ))}
        </div>

        <footer className="mt-auto flex items-center gap-4 border-t border-white/[0.08] pt-3.5 text-[11px] text-white/40">
          <span className="inline-flex items-center gap-1 font-mono">
            <Star className="size-3" aria-hidden />
            {formatCompactNumber(repo.stars)}
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <GitFork className="size-3" aria-hidden />
            {formatCompactNumber(repo.forks)}
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <CircleDot className="size-3" aria-hidden />
            {formatCompactNumber(repo.openIssues)}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-white/30">
            <Clock className="size-3" aria-hidden />
            {formatRelativeTime(repo.pushedAt)}
          </span>
        </footer>
    </article>
  );
}
