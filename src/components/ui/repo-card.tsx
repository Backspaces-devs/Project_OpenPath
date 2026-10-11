import Link from "next/link";
import { Star, GitFork, CircleDot, ExternalLink, Bookmark, Clock, GitPullRequest } from "lucide-react";
import { VibeBadge } from "./vibe-badge";

export interface RepoCardData {
  id: number | string;
  owner: string;
  name: string;
  full_name: string;
  description?: string | null;
  html_url: string;
  primary_language?: string | null;
  topics?: string[] | null;
  stars: number;
  forks: number;
  open_issues_count: number;
  good_first_issue_count?: number;
  vibe_score?: number | null;
  vibe_breakdown?: {
    maintainerResponsiveness?: { raw: number; note: string };
    newcomerMergeRate?: { raw: number; note: string };
    onboardingClarity?: { raw: number; note: string };
    activityHealth?: { raw: number; note: string };
    beginnerSurface?: { raw: number; note: string };
  } | null;
  avg_first_response_hours?: number | null;
  newcontributor_pr_merge_rate?: number | null;
  last_pushed_at?: string | null;
}

interface RepoCardProps {
  repo: RepoCardData;
}

export function RepoCard({ repo }: RepoCardProps) {
  const gfiCount = repo.good_first_issue_count ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between gap-3 hover:bg-white/[0.07] transition-colors group">
      <div className="flex flex-col gap-2.5">
        {/* Header: Name + Vibe Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] text-white/40 block truncate">
              {repo.owner}
            </span>
            <Link
              href={`https://github.com/${repo.full_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm sm:text-base font-semibold text-white hover:text-[#18CCFC] transition-colors truncate block"
            >
              {repo.name}
            </Link>
          </div>
          <VibeBadge score={repo.vibe_score} />
        </div>

        {/* Description */}
        <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
          {repo.description || "No description provided for this repository."}
        </p>

        {/* Topics / Language Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {repo.primary_language && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/70 font-medium">
              {repo.primary_language}
            </span>
          )}
          {repo.topics?.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.04] text-white/40"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* Vibe Highlights Tile */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 flex items-center justify-between text-[11px] text-white/50">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-white/40" />
            <span>
              {repo.avg_first_response_hours
                ? `Resp ~${Math.round(repo.avg_first_response_hours)}h`
                : "Active"}
            </span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <GitPullRequest className="size-3.5 text-white/40" />
            <span>
              {repo.newcontributor_pr_merge_rate !== null && repo.newcontributor_pr_merge_rate !== undefined
                ? `${Math.round(repo.newcontributor_pr_merge_rate * 100)}% merge`
                : "Open PRs"}
            </span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <CircleDot className="size-3.5 text-emerald-400/80" />
            <span className="font-mono text-emerald-400/90 font-medium">
              {gfiCount} {gfiCount === 1 ? "GFI" : "GFIs"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Stats & Actions */}
      <div className="flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs">
        <div className="flex items-center gap-3 text-white/40 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1 hover:text-white/70 transition-colors">
            <Star className="size-3.5" />
            {repo.stars.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1 hover:text-white/70 transition-colors">
            <GitFork className="size-3.5" />
            {repo.forks.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Save repository"
            className="flex items-center justify-center size-7 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Bookmark className="size-3.5" />
          </button>
          <Link
            href={`https://github.com/${repo.full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-black hover:bg-white/90 transition-colors"
          >
            <span>Explore</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
