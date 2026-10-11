import {
  VIBE_COMPONENTS,
  VIBE_COMPONENT_WEIGHTS,
  vibeGrade,
  RepoMetricsSchema,
  type ResolvedRepoMetrics,
  type RepoMetrics,
  type VibeBreakdown,
  type VibeComponent,
  type VibeComponentScore,
  type VibeResult,
} from "@/lib/scoring/types";
import { clamp } from "@/lib/utils";

/**
 * Vibe Score — "is this a repo worth your weekend?"
 *
 * Five weighted components, each built from signals that are individually
 * normalised to 0–100. Components with no data at all are dropped and their
 * weight is redistributed across the ones we do have, so a thin search-result
 * repo still gets a sensible (low-confidence) number instead of a fake zero.
 *
 * Pure function: same input, same output, no I/O. See vibe-score.test.ts.
 */

interface Signal {
  value: number;
  weight: number;
}

type SignalSet = Partial<Record<string, Signal>>;

/** Logarithmic 0–100 curve. `ceiling` is the value that scores 100. */
function logScale(value: number, ceiling: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return clamp((Math.log1p(value) / Math.log1p(ceiling)) * 100, 0, 100);
}

/** Freshness decay: 100 today, ~82 at a month, ~55 at three months, ~9 at a year. */
function freshnessScale(days: number): number {
  if (!Number.isFinite(days) || days < 0) return 100;
  return clamp(100 * Math.exp(-days / 150), 0, 100);
}

/** Linear ramp: full marks at or below `great`, zero at or beyond `poor`. */
function inverseScale(value: number, great: number, poor: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= great) return 100;
  if (value >= poor) return 0;
  return clamp(((poor - value) / (poor - great)) * 100, 0, 100);
}

function booleanScale(value: boolean | null | undefined): number | null {
  return value === null || value === undefined ? null : value ? 100 : 0;
}

function ratioScale(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator === null || numerator === undefined) return null;
  if (denominator === null || denominator === undefined) return null;
  const total = numerator + denominator;
  if (total <= 0) return null;
  return clamp((numerator / total) * 100, 0, 100);
}

/** Weighted average of whatever signals are present, plus how complete it was. */
function collapse(signals: SignalSet, totalWeight: number): { score: number; coverage: number; values: Record<string, number> } {
  let weighted = 0;
  let present = 0;
  const values: Record<string, number> = {};

  for (const [key, signal] of Object.entries(signals)) {
    if (!signal) continue;
    weighted += signal.value * signal.weight;
    present += signal.weight;
    values[key] = round1(signal.value);
  }

  return {
    score: present > 0 ? weighted / present : 0,
    coverage: totalWeight > 0 ? present / totalWeight : 0,
    values,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function activityComponent(m: ResolvedRepoMetrics): { score: number; coverage: number; signals: Record<string, number> } {
  const signals: SignalSet = {
    freshness:
      m.daysSinceLastPush === null || m.daysSinceLastPush === undefined
        ? undefined
        : { value: freshnessScale(m.daysSinceLastPush), weight: 0.6 },
    commitCadence:
      m.commitsLast90Days === null || m.commitsLast90Days === undefined
        ? undefined
        : { value: logScale(m.commitsLast90Days, 500), weight: 0.4 },
  };
  const { score, coverage, values } = collapse(signals, 1);

  // An archived repo is definitionally dead, regardless of the last push date.
  const finalScore = m.archived ? Math.min(score, 5) : score;
  return { score: finalScore, coverage, signals: { ...values, ...(m.archived ? { archived: 0 } : {}) } };
}

function communityComponent(m: ResolvedRepoMetrics): { score: number; coverage: number; signals: Record<string, number> } {
  const audience = m.watchers ?? m.subscribers ?? null;
  const signals: SignalSet = {
    stars: { value: logScale(m.stars, 25_000), weight: 0.45 },
    contributors:
      m.contributors === null || m.contributors === undefined
        ? undefined
        : { value: logScale(m.contributors, 500), weight: 0.35 },
    audience:
      audience === null
        ? undefined
        : { value: logScale(audience, 5_000), weight: 0.2 },
  };
  const { score, coverage, values } = collapse(signals, 1);
  return { score, coverage, signals: values };
}

function responsivenessComponent(m: ResolvedRepoMetrics): { score: number; coverage: number; signals: Record<string, number> } {
  const issueCloseRate = ratioScale(m.closedIssues, m.openIssues);
  const prMergeRate = ratioScale(m.mergedPullRequests, m.totalPullRequests);

  const signals: SignalSet = {
    issueCloseRate: issueCloseRate === null ? undefined : { value: issueCloseRate, weight: 0.4 },
    issueCloseSpeed:
      m.medianIssueCloseHours === null || m.medianIssueCloseHours === undefined
        ? undefined
        : { value: inverseScale(m.medianIssueCloseHours, 24, 720), weight: 0.35 },
    prMergeRate: prMergeRate === null ? undefined : { value: prMergeRate, weight: 0.25 },
  };
  const { score, coverage, values } = collapse(signals, 1);
  return { score, coverage, signals: values };
}

function beginnerFriendlinessComponent(m: ResolvedRepoMetrics): { score: number; coverage: number; signals: Record<string, number> } {
  const contributing = booleanScale(m.hasContributing);
  const coc = booleanScale(m.hasCodeOfConduct);

  const signals: SignalSet = {
    goodFirstIssues:
      m.goodFirstIssues === null || m.goodFirstIssues === undefined
        ? undefined
        : { value: logScale(m.goodFirstIssues, 50), weight: 0.4 },
    helpWantedIssues:
      m.helpWantedIssues === null || m.helpWantedIssues === undefined
        ? undefined
        : { value: logScale(m.helpWantedIssues, 30), weight: 0.2 },
    contributingGuide: contributing === null ? undefined : { value: contributing, weight: 0.25 },
    codeOfConduct: coc === null ? undefined : { value: coc, weight: 0.15 },
  };
  const { score, coverage, values } = collapse(signals, 1);
  return { score, coverage, signals: values };
}

function clarityComponent(m: ResolvedRepoMetrics): { score: number; coverage: number; signals: Record<string, number> } {
  const license = booleanScale(m.hasLicense);
  const homepage = booleanScale(m.hasHomepage);
  const readme = booleanScale(m.hasReadme);

  const signals: SignalSet = {
    description: { value: logScale(Math.min(m.descriptionLength, 120), 120), weight: 0.3 },
    topics: { value: logScale(m.topicsCount, 15), weight: 0.25 },
    homepage: homepage === null ? undefined : { value: homepage, weight: 0.2 },
    license: license === null ? undefined : { value: license, weight: 0.25 },
  };
  const { score, coverage, values } = collapse(signals, 1);

  // A repo that cannot even say what it does should not score well on clarity.
  const finalScore = m.descriptionLength === 0 ? Math.min(score, 40) : score;
  const finalValues = { ...values };
  if (readme !== null) finalValues.readme = readme;

  return { score: finalScore, coverage, signals: finalValues };
}

const COMPONENT_FACTORIES: Record<
  VibeComponent,
  (m: ResolvedRepoMetrics) => { score: number; coverage: number; signals: Record<string, number> }
> = {
  activity: activityComponent,
  community: communityComponent,
  responsiveness: responsivenessComponent,
  beginnerFriendliness: beginnerFriendlinessComponent,
  clarity: clarityComponent,
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Score a repository from 0–100.
 *
 * @example
 * calculateVibeScore({ stars: 1200, forks: 80, openIssues: 12, daysSinceLastPush: 3, topicsCount: 8, descriptionLength: 140 })
 */
export function calculateVibeScore(input: RepoMetrics): VibeResult {
  const parsed = RepoMetricsSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `Invalid RepoMetrics: ${parsed.error.issues
        .map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  const metrics = parsed.data;

  const breakdown = {} as VibeBreakdown;
  let weightedScore = 0;
  let availableWeight = 0;
  let confidenceMass = 0;
  const availableComponents: VibeComponent[] = [];

  for (const component of VIBE_COMPONENTS) {
    const { score, coverage, signals } = COMPONENT_FACTORIES[component](metrics);
    const weight = VIBE_COMPONENT_WEIGHTS[component];

    if (coverage > 0) {
      availableComponents.push(component);
      weightedScore += score * weight;
      availableWeight += weight;
    }
    confidenceMass += weight * coverage;

    breakdown[component] = {
      score: round1(score),
      coverage: Math.round(coverage * 1000) / 1000,
      effectiveWeight: 0,
      signals,
    } satisfies VibeComponentScore;
  }

  const rawScore = availableWeight > 0 ? weightedScore / availableWeight : 0;

  // Forks are rarely the repo doing the work; knock a little off the headline.
  const forkPenalty = metrics.isFork ? 3 : 0;

  const score = clamp(round1(rawScore - forkPenalty), 0, 100);

  for (const component of availableComponents) {
    breakdown[component].effectiveWeight =
      Math.round((VIBE_COMPONENT_WEIGHTS[component] / (availableWeight || 1)) * 1000) / 1000;
  }

  return {
    score,
    confidence: clamp(Math.round(confidenceMass * 1000) / 1000, 0, 1),
    breakdown,
    availableComponents,
    grade: vibeGrade(score),
  };
}

/**
 * Build `RepoMetrics` from a plain GitHub search result — the "thin" path used
 * when we have not synced a repo into Supabase yet. Everything we cannot know
 * from the search payload stays `null`, which shows up as lower confidence.
 */
export function metricsFromSearchResult(repo: {
  stargazers_count?: number | null;
  forks_count?: number | null;
  open_issues_count?: number | null;
  watchers_count?: number | null;
  subscribers_count?: number | null;
  topics?: string[] | null;
  description?: string | null;
  homepage?: string | null;
  license?: { spdx_id?: string | null; key?: string | null } | null;
  pushed_at?: string | null;
  created_at?: string | null;
  archived?: boolean | null;
  fork?: boolean | null;
}): RepoMetrics {
  const pushed = repo.pushed_at ? Date.parse(repo.pushed_at) : NaN;
  const created = repo.created_at ? Date.parse(repo.created_at) : NaN;
  const topics = repo.topics ?? [];

  return {
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? 0,
    watchers: repo.watchers_count ?? repo.subscribers_count ?? null,
    topicsCount: topics.length,
    descriptionLength: (repo.description ?? "").length,
    daysSinceLastPush: Number.isNaN(pushed) ? null : Math.max(0, Math.floor((Date.now() - pushed) / 86_400_000)),
    daysSinceCreation: Number.isNaN(created) ? null : Math.max(0, Math.floor((Date.now() - created) / 86_400_000)),
    hasLicense: Boolean(repo.license?.spdx_id || repo.license?.key),
    hasHomepage: repo.homepage ? true : false,
    archived: Boolean(repo.archived),
    isFork: Boolean(repo.fork),
  };
}
