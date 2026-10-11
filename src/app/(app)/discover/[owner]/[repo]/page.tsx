import {
  ArrowLeft,
  BookMarked,
  CircleDot,
  ExternalLink,
  FileText,
  GitFork,
  Globe,
  Scale,
  Star,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CommitActivityChart } from "@/components/charts/commit-activity";
import { VibeBreakdown } from "@/components/discover/vibe-breakdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { SaveButton } from "@/components/ui/save-button";
import { SkeletonLine } from "@/components/ui/skeleton-card";
import { VibeBadge } from "@/components/ui/vibe-badge";
import { getRepositoryDetail } from "@/lib/data/repositories";
import { cn, formatCompactNumber, formatNumber, formatRelativeTime } from "@/lib/utils";

export const instant = false;

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { owner, repo } = await params;
  return { title: `${owner}/${repo} · OpenPath` };
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { owner, repo } = await params;

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail owner={owner} repo={repo} />
    </Suspense>
  );
}

async function Detail({ owner, repo }: { owner: string; repo: string }) {
  // Live GitHub data — render at request time, never during prerender.
  await connection();

  let detail;
  try {
    detail = await getRepositoryDetail(owner, repo);
  } catch (error) {
    return (
      <EmptyState
        icon={CircleDot}
        title="We could not load this repository"
        description={
          error instanceof Error
            ? `${error.message} Check /settings for the live status of your GitHub connection.`
            : "Unexpected error."
        }
        action={
          <Link
            href="/discover"
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-colors duration-200 hover:bg-white/90"
          >
            Back to Discover
          </Link>
        }
      />
    );
  }

  if (!detail) notFound();

  const { repo: card, goodFirstIssues, contributors, commitActivity, docs, warning } = detail;

  return (
    <div className="space-y-6">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-xs text-white/40 transition-colors duration-200 hover:text-white/80"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Discover
      </Link>

      <header className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] text-white/40">{card.owner}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-white/90 sm:text-2xl">
                {card.name}
              </h1>
              {card.archived ? (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
                  archived
                </span>
              ) : null}
              {card.isFork ? (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
                  fork
                </span>
              ) : null}
            </div>
            {card.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">{card.description}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={card.htmlUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors duration-200 hover:bg-white/[0.09] hover:text-white"
              >
                View on GitHub
                <ExternalLink className="size-3" aria-hidden />
              </a>
              {card.homepage ? (
                <a
                  href={card.homepage}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors duration-200 hover:bg-white/[0.09] hover:text-white"
                >
                  <Globe className="size-3" aria-hidden />
                  Website
                </a>
              ) : null}
              <SaveButton fullName={card.fullName} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.09]" />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <VibeBadge score={card.vibe.score} confidence={card.vibe.confidence} size="lg" />
            <span className="font-mono text-[10px] text-white/30">
              {Math.round(card.vibe.confidence * 100)}% coverage
            </span>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.08] pt-5 sm:grid-cols-4">
          <Stat icon={Star} label="Stars" value={formatCompactNumber(card.stars)} />
          <Stat icon={GitFork} label="Forks" value={formatCompactNumber(card.forks)} />
          <Stat icon={CircleDot} label="Open issues" value={formatCompactNumber(card.openIssues)} />
          <Stat icon={Users} label="Contributors" value={formatNumber(card.contributors)} />
        </dl>
      </header>

      {warning ? <Notice tone="warning">{warning}</Notice> : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Commit activity" subtitle="Last 13 weeks">
            {commitActivity.length > 0 ? (
              <CommitActivityChart data={commitActivity} />
            ) : (
              <p className="text-sm text-white/40">
                Commit history is only charted on the live path. Sync this repo to store it.
              </p>
            )}
          </Panel>

          <Panel
            title="Good first issues"
            subtitle={goodFirstIssues.length > 0 ? `${goodFirstIssues.length} open` : "None open right now"}
          >
            {goodFirstIssues.length > 0 ? (
              <ul className="divide-y divide-white/[0.06]">
                {goodFirstIssues.map((issue) => (
                  <li key={issue.id}>
                    <a
                      href={issue.htmlUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex items-start gap-3 py-3 transition-colors duration-200 hover:bg-white/[0.03]"
                    >
                      <span className="mt-0.5 font-mono text-[11px] text-white/30">
                        #{issue.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white/80 group-hover:text-white">
                          {issue.title}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-white/30">
                          opened {formatRelativeTime(issue.createdAt)} · {issue.comments} comments
                        </span>
                      </span>
                      <ExternalLink
                        className="mt-0.5 size-3.5 shrink-0 text-white/20 group-hover:text-white/50"
                        aria-hidden
                      />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/40">
                No open issues labelled <span className="font-mono text-white/60">good first issue</span>{" "}
                — the beginner signals above are estimated from what the repo does publish.
              </p>
            )}
          </Panel>

          {contributors.length > 0 ? (
            <Panel title="Top contributors" subtitle={`${card.contributors ?? contributors.length} total`}>
              <div className="flex flex-wrap gap-2">
                {contributors.map((contributor) => (
                  <a
                    key={contributor.login}
                    href={contributor.htmlUrl ?? `https://github.com/${contributor.login}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1.5 pr-3 pl-1.5 transition-colors duration-200 hover:bg-white/[0.07]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={contributor.avatarUrl ?? ""}
                      alt=""
                      className="size-6 rounded-full border border-white/10 object-cover"
                    />
                    <span className="text-xs text-white/70 group-hover:text-white">
                      {contributor.login}
                    </span>
                    <span className="font-mono text-[10px] text-white/25">
                      {formatCompactNumber(contributor.contributions)}
                    </span>
                  </a>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-5">
          <Panel title="Vibe Score" subtitle="How the number is built">
            <VibeBreakdown vibe={card.vibe} />
          </Panel>

          <Panel title="Repository health">
            <dl className="space-y-3 text-sm">
              <Row label="Language" value={card.language ?? "—"} />
              <Row label="License" value={card.license ?? "None"} />
              <Row label="Default branch" value={card.defaultBranch} mono />
              <Row label="Created" value={formatRelativeTime(card.createdAt)} />
              <Row label="Last push" value={formatRelativeTime(card.pushedAt)} />
              <Row label="Commits (90d)" value={formatNumber(card.commitsLast90Days)} />
              <Row
                label="Median issue close"
                value={
                  card.medianIssueCloseHours === null
                    ? "—"
                    : card.medianIssueCloseHours < 48
                      ? `${card.medianIssueCloseHours.toFixed(1)}h`
                      : `${(card.medianIssueCloseHours / 24).toFixed(1)}d`
                }
              />
              <Row label="Source" value={card.source === "database" ? "Supabase" : "GitHub API"} />
            </dl>
          </Panel>

          <Panel title="Documentation">
            <ul className="space-y-2.5 text-sm">
              <DocRow icon={FileText} label="README" present={docs.readme} />
              <DocRow icon={BookMarked} label="CONTRIBUTING" present={docs.contributing} />
              <DocRow icon={Scale} label="Code of conduct" present={docs.codeOfConduct} />
              <DocRow icon={Scale} label="License file" present={docs.license} />
            </ul>
          </Panel>

          {card.topics.length > 0 ? (
            <Panel title="Topics">
              <div className="flex flex-wrap gap-1.5">
                {card.topics.slice(0, 24).map((topic) => (
                  <Link
                    key={topic}
                    href={`/discover?topic=${encodeURIComponent(topic)}`}
                    className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/50 transition-colors duration-200 hover:bg-white/[0.09] hover:text-white/90"
                  >
                    {topic}
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-white/90">{title}</h2>
        {subtitle ? <span className="font-mono text-[10px] text-white/30">{subtitle}</span> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div>
      <dt className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
        <Icon className="size-3" aria-hidden />
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-lg text-white/90">{value}</dd>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-white/40">{label}</dt>
      <dd className={cn("text-white/80", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function DocRow({
  icon: Icon,
  label,
  present,
}: {
  icon: LucideIcon;
  label: string;
  present: boolean | null;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-white/60">
        <Icon className="size-3.5 text-white/30" aria-hidden />
        {label}
      </span>
      {present === null ? (
        <span className="text-[11px] text-white/30">unknown</span>
      ) : present ? (
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] text-emerald-400/90">
          present
        </span>
      ) : (
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40">
          missing
        </span>
      )}
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonLine className="h-3 w-20" />
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="mt-2 h-6 w-64" />
        <SkeletonLine className="mt-4 h-3 w-full max-w-xl" />
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonLine className="h-3 w-16" />
              <SkeletonLine className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SkeletonLine className="h-56 rounded-2xl" />
          <SkeletonLine className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <SkeletonLine className="h-72 rounded-2xl" />
          <SkeletonLine className="h-56 rounded-2xl" />
        </div>
      </div>
      <p className="text-center text-xs text-white/30">Fetching live metrics from GitHub…</p>
    </div>
  );
}
