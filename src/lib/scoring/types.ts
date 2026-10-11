import { z } from 'zod';

export const RepoMetricsSchema = z.object({
  avgFirstResponseHours: z.number().nullable(),
  newcontributorPrMergeRate: z.number().nullable(),
  newcontributorPrSampleSize: z.number().nullable(),
  hasContributing: z.boolean(),
  hasCodeOfConduct: z.boolean(),
  hasIssueTemplate: z.boolean(),
  readmeLength: z.number(),
  contributingMentionsSetup: z.boolean(),
  commitCount30d: z.number(),
  lastPushedAt: z.string().nullable(),
  goodFirstIssueCount: z.number(),
  staleGfiRatio: z.number(), // 0 to 1
});

export type RepoMetrics = z.infer<typeof RepoMetricsSchema>;

export const ComponentScoreSchema = z.object({
  raw: z.number(),
  weighted: z.number(),
  isNeutralFallback: z.boolean().default(false),
  note: z.string(),
});
export type ComponentScore = z.infer<typeof ComponentScoreSchema>;

export const VibeBreakdownSchema = z.object({
  maintainerResponsiveness: ComponentScoreSchema,
  newcomerMergeRate: ComponentScoreSchema,
  onboardingClarity: ComponentScoreSchema,
  activityHealth: ComponentScoreSchema,
  beginnerSurface: ComponentScoreSchema,
});
export type VibeBreakdown = z.infer<typeof VibeBreakdownSchema>;

export const VibeResultSchema = z.object({
  score: z.number(),
  breakdown: VibeBreakdownSchema,
  confidence: z.enum(['high', 'low']),
});
export type VibeResult = z.infer<typeof VibeResultSchema>;
