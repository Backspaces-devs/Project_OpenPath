import {
  type RepoMetrics,
  type ComponentScore,
  type VibeResult,
  type VibeBreakdown,
} from './types';

/**
 * 1. Maintainer Responsiveness (Weight: 0.25)
 * <= 24h -> 100, <= 72h -> 80, <= 168h (7d) -> 55, <= 336h (14d) -> 30, else -> 10
 * No data -> 50 (neutral fallback, flags low confidence)
 */
export function scoreMaintainerResponsiveness(hours: number | null): ComponentScore {
  const weight = 0.25;

  if (hours === null || hours === undefined || isNaN(hours)) {
    return {
      raw: 50,
      weighted: 50 * weight,
      isNeutralFallback: true,
      note: 'No response time data available (defaulted to 50)',
    };
  }

  let raw: number;
  let note: string;

  if (hours <= 24) {
    raw = 100;
    note = `Lightning fast responses (~${Math.round(hours)}h avg)`;
  } else if (hours <= 72) {
    raw = 80;
    note = `Active maintainers (~${Math.round(hours)}h avg)`;
  } else if (hours <= 168) {
    raw = 55;
    note = `Moderate response time (~${Math.round(hours / 24)}d avg)`;
  } else if (hours <= 336) {
    raw = 30;
    note = `Slow response time (~${Math.round(hours / 24)}d avg)`;
  } else {
    raw = 10;
    note = `Very slow response time (>14d avg)`;
  }

  return {
    raw,
    weighted: Math.round(raw * weight * 100) / 100,
    isNeutralFallback: false,
    note,
  };
}

/**
 * 2. Newcomer PR Merge Rate (Weight: 0.25)
 * newcontributor_pr_merge_rate * 100
 * If sample_size < 5 -> dampen toward 50 by 50%
 * No data -> 50 (neutral fallback, flags low confidence)
 */
export function scoreNewcomerMergeRate(
  rate: number | null,
  sampleSize: number | null
): ComponentScore {
  const weight = 0.25;

  if (rate === null || rate === undefined || isNaN(rate)) {
    return {
      raw: 50,
      weighted: 50 * weight,
      isNeutralFallback: true,
      note: 'No newcomer PR data available (defaulted to 50)',
    };
  }

  let raw = Math.max(0, Math.min(100, rate * 100));
  const samples = sampleSize ?? 0;

  if (samples < 5) {
    // Dampen toward 50 by 50%: raw = raw * 0.5 + 50 * 0.5
    raw = raw * 0.5 + 25;
    return {
      raw: Math.round(raw),
      weighted: Math.round(raw * weight * 100) / 100,
      isNeutralFallback: false,
      note: `Small sample size (${samples} PRs), score dampened toward neutral: ${Math.round(raw)}%`,
    };
  }

  return {
    raw: Math.round(raw),
    weighted: Math.round(raw * weight * 100) / 100,
    isNeutralFallback: false,
    note: `${Math.round(rate * 100)}% of first-time PRs merged (${samples} analyzed)`,
  };
}

/**
 * 3. Onboarding Clarity (Weight: 0.20)
 * +40 if has CONTRIBUTING.md
 * +15 if has CODE_OF_CONDUCT.md
 * +15 if has issue template
 * +15 if readme > 800 chars
 * +15 if CONTRIBUTING mentions setup/install/test
 */
export function scoreOnboardingClarity(metrics: {
  hasContributing: boolean;
  hasCodeOfConduct: boolean;
  hasIssueTemplate: boolean;
  readmeLength: number;
  contributingMentionsSetup: boolean;
}): ComponentScore {
  const weight = 0.20;
  let raw = 0;
  const notes: string[] = [];

  if (metrics.hasContributing) {
    raw += 40;
    notes.push('CONTRIBUTING.md (+40)');
  }
  if (metrics.hasCodeOfConduct) {
    raw += 15;
    notes.push('Code of Conduct (+15)');
  }
  if (metrics.hasIssueTemplate) {
    raw += 15;
    notes.push('Issue templates (+15)');
  }
  if (metrics.readmeLength > 800) {
    raw += 15;
    notes.push('Comprehensive README (+15)');
  }
  if (metrics.contributingMentionsSetup) {
    raw += 15;
    notes.push('Setup guide in contributing doc (+15)');
  }

  return {
    raw,
    weighted: Math.round(raw * weight * 100) / 100,
    isNeutralFallback: false,
    note: notes.length > 0 ? notes.join(', ') : 'Minimal onboarding documentation',
  };
}

/**
 * 4. Activity Health (Weight: 0.20)
 * >= 30 commits & pushed <7d ago  -> 100
 * >= 10 commits & pushed <30d ago -> 75
 * >= 3 commits  & pushed <90d ago -> 45
 * else -> 15
 */
export function scoreActivityHealth(
  commitCount30d: number,
  lastPushedAt: string | null
): ComponentScore {
  const weight = 0.20;

  if (!lastPushedAt) {
    return {
      raw: 15,
      weighted: 15 * weight,
      isNeutralFallback: false,
      note: 'No recent commit or push activity',
    };
  }

  const daysSincePush = Math.max(
    0,
    (Date.now() - new Date(lastPushedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  let raw = 15;
  let note = 'Low activity (pushed >90d ago or <3 recent commits)';

  if (commitCount30d >= 30 && daysSincePush < 7) {
    raw = 100;
    note = `High activity: ${commitCount30d} commits in 30d, pushed ${Math.round(daysSincePush)}d ago`;
  } else if (commitCount30d >= 10 && daysSincePush < 30) {
    raw = 75;
    note = `Steady activity: ${commitCount30d} commits in 30d, pushed ${Math.round(daysSincePush)}d ago`;
  } else if (commitCount30d >= 3 && daysSincePush < 90) {
    raw = 45;
    note = `Moderate activity: ${commitCount30d} commits in 30d, pushed ${Math.round(daysSincePush)}d ago`;
  }

  return {
    raw,
    weighted: Math.round(raw * weight * 100) / 100,
    isNeutralFallback: false,
    note,
  };
}

/**
 * 5. Beginner Surface (Weight: 0.10)
 * min(100, gfi_count * 6) * (1 - stale_ratio)
 */
export function scoreBeginnerSurface(
  gfiCount: number,
  staleRatio: number
): ComponentScore {
  const weight = 0.10;
  const clampedGfi = Math.max(0, gfiCount);
  const clampedStaleRatio = Math.max(0, Math.min(1, staleRatio));

  const baseScore = Math.min(100, clampedGfi * 6);
  const raw = Math.round(baseScore * (1 - clampedStaleRatio));

  return {
    raw,
    weighted: Math.round(raw * weight * 100) / 100,
    isNeutralFallback: false,
    note: `${gfiCount} good first issues (${Math.round(clampedStaleRatio * 100)}% stale)`,
  };
}

/**
 * Master Vibe Score Calculator
 */
export function calculateVibeScore(metrics: RepoMetrics): VibeResult {
  const maintainer = scoreMaintainerResponsiveness(metrics.avgFirstResponseHours);
  const newcomer = scoreNewcomerMergeRate(
    metrics.newcontributorPrMergeRate,
    metrics.newcontributorPrSampleSize
  );
  const onboarding = scoreOnboardingClarity({
    hasContributing: metrics.hasContributing,
    hasCodeOfConduct: metrics.hasCodeOfConduct,
    hasIssueTemplate: metrics.hasIssueTemplate,
    readmeLength: metrics.readmeLength,
    contributingMentionsSetup: metrics.contributingMentionsSetup,
  });
  const activity = scoreActivityHealth(metrics.commitCount30d, metrics.lastPushedAt);
  const beginner = scoreBeginnerSurface(metrics.goodFirstIssueCount, metrics.staleGfiRatio);

  const breakdown: VibeBreakdown = {
    maintainerResponsiveness: maintainer,
    newcomerMergeRate: newcomer,
    onboardingClarity: onboarding,
    activityHealth: activity,
    beginnerSurface: beginner,
  };

  const totalScore = Math.round(
    maintainer.weighted +
      newcomer.weighted +
      onboarding.weighted +
      activity.weighted +
      beginner.weighted
  );

  // Confidence check: if > 2 components used neutral fallbacks, flag low confidence
  const fallbackCount = [maintainer, newcomer, onboarding, activity, beginner].filter(
    (c) => c.isNeutralFallback
  ).length;

  return {
    score: Math.max(0, Math.min(100, totalScore)),
    breakdown,
    confidence: fallbackCount > 2 ? 'low' : 'high',
  };
}
