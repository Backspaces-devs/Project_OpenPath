import { z } from "zod";

/**
 * Every signal the Vibe Score can use.
 *
 * Fields are nullable rather than defaulted on purpose: `null` means "we never
 * measured this", which is exactly what drives `confidence`. Only the handful of
 * values the GitHub search API always returns get a zero default.
 */
export const RepoMetricsSchema = z.object({
  stars: z.number().min(0).default(0),
  forks: z.number().min(0).default(0),
  openIssues: z.number().min(0).default(0),
  topicsCount: z.number().min(0).default(0),
  descriptionLength: z.number().min(0).default(0),

  watchers: z.number().min(0).nullish(),
  subscribers: z.number().min(0).nullish(),
  contributors: z.number().min(0).nullish(),
  commitsLast90Days: z.number().min(0).nullish(),
  commitsLastYear: z.number().min(0).nullish(),
  // Not clamped in the schema: clock skew can legitimately produce a small
  // negative here, and the scoring curves already treat < 0 as "right now".
  daysSinceLastPush: z.number().nullish(),
  daysSinceCreation: z.number().nullish(),

  goodFirstIssues: z.number().min(0).nullish(),
  helpWantedIssues: z.number().min(0).nullish(),
  closedIssues: z.number().min(0).nullish(),
  mergedPullRequests: z.number().min(0).nullish(),
  totalPullRequests: z.number().min(0).nullish(),
  medianIssueCloseHours: z.number().nullish(),

  hasReadme: z.boolean().nullish(),
  hasLicense: z.boolean().nullish(),
  hasContributing: z.boolean().nullish(),
  hasCodeOfConduct: z.boolean().nullish(),
  hasHomepage: z.boolean().nullish(),

  archived: z.boolean().default(false),
  isFork: z.boolean().default(false),
});

export type RepoMetrics = z.input<typeof RepoMetricsSchema>;
export type ResolvedRepoMetrics = z.output<typeof RepoMetricsSchema>;

export const VIBE_COMPONENTS = [
  "activity",
  "community",
  "responsiveness",
  "beginnerFriendliness",
  "clarity",
] as const;

export type VibeComponent = (typeof VIBE_COMPONENTS)[number];

export const VibeComponentScoreSchema = z.object({
  /** 0–100. */
  score: z.number(),
  /** 0–1: how much of this component we actually had data for. */
  coverage: z.number(),
  /** Share of the final score this component contributed after redistribution. */
  effectiveWeight: z.number(),
  /** Individual normalised signals, useful for debugging and tooltips. */
  signals: z.record(z.string(), z.number()),
});

export type VibeComponentScore = z.infer<typeof VibeComponentScoreSchema>;

export const VibeBreakdownSchema = z.record(z.string(), VibeComponentScoreSchema);

export type VibeBreakdown = Record<VibeComponent, VibeComponentScore>;

export const VibeGradeSchema = z.enum(["exceptional", "strong", "promising", "quiet"]);
export type VibeGrade = z.infer<typeof VibeGradeSchema>;

export const VibeResultSchema = z.object({
  /** 0–100, one decimal place. */
  score: z.number(),
  /** 0–1. Below ~0.5 means the score is a rough estimate. */
  confidence: z.number(),
  breakdown: VibeBreakdownSchema,
  /** Which of the five components we had any data for. */
  availableComponents: z.array(z.string()),
  /** Human label for the score band. */
  grade: VibeGradeSchema,
});

export type VibeResult = {
  score: number;
  confidence: number;
  breakdown: VibeBreakdown;
  availableComponents: VibeComponent[];
  grade: VibeGrade;
};

/** Score bands used by the `VibeBadge` tint rules. */
export function vibeGrade(score: number): VibeGrade {
  if (score >= 90) return "exceptional";
  if (score >= 75) return "strong";
  if (score >= 60) return "promising";
  return "quiet";
}

export const VIBE_COMPONENT_LABELS: Record<VibeComponent, string> = {
  activity: "Activity",
  community: "Community",
  responsiveness: "Responsiveness",
  beginnerFriendliness: "Beginner friendly",
  clarity: "Clarity",
};

export const VIBE_COMPONENT_WEIGHTS: Record<VibeComponent, number> = {
  activity: 0.3,
  community: 0.2,
  responsiveness: 0.2,
  beginnerFriendliness: 0.15,
  clarity: 0.15,
};
