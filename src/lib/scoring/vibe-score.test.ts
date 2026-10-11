import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVibeScore,
  scoreMaintainerResponsiveness,
  scoreNewcomerMergeRate,
  scoreOnboardingClarity,
  scoreActivityHealth,
  scoreBeginnerSurface,
} from './vibe-score';

test('scoreMaintainerResponsiveness - accurate bracket evaluation', () => {
  assert.equal(scoreMaintainerResponsiveness(12).raw, 100);
  assert.equal(scoreMaintainerResponsiveness(48).raw, 80);
  assert.equal(scoreMaintainerResponsiveness(120).raw, 55);
  assert.equal(scoreMaintainerResponsiveness(200).raw, 30);
  assert.equal(scoreMaintainerResponsiveness(500).raw, 10);

  const fallback = scoreMaintainerResponsiveness(null);
  assert.equal(fallback.raw, 50);
  assert.equal(fallback.isNeutralFallback, true);
});

test('scoreNewcomerMergeRate - dampening for small samples', () => {
  // 100% merge rate with 10 samples -> 100 raw
  const largeSample = scoreNewcomerMergeRate(1.0, 10);
  assert.equal(largeSample.raw, 100);

  // 100% merge rate with 2 samples -> dampened to 50% towards 50 = 75
  const smallSample = scoreNewcomerMergeRate(1.0, 2);
  assert.equal(smallSample.raw, 75);

  // 0% merge rate with 1 sample -> dampened from 0 towards 50 = 25
  const zeroSample = scoreNewcomerMergeRate(0.0, 1);
  assert.equal(zeroSample.raw, 25);

  const fallback = scoreNewcomerMergeRate(null, null);
  assert.equal(fallback.raw, 50);
  assert.equal(fallback.isNeutralFallback, true);
});

test('scoreOnboardingClarity - cumulative documentation scoring', () => {
  const fullDocs = scoreOnboardingClarity({
    hasContributing: true,
    hasCodeOfConduct: true,
    hasIssueTemplate: true,
    readmeLength: 1200,
    contributingMentionsSetup: true,
  });
  assert.equal(fullDocs.raw, 100);

  const partialDocs = scoreOnboardingClarity({
    hasContributing: true,
    hasCodeOfConduct: false,
    hasIssueTemplate: true,
    readmeLength: 500,
    contributingMentionsSetup: false,
  });
  // 40 + 0 + 15 + 0 + 0 = 55
  assert.equal(partialDocs.raw, 55);
});

test('scoreActivityHealth - commit recency and push date', () => {
  const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(scoreActivityHealth(35, recentDate).raw, 100);

  const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(scoreActivityHealth(5, oldDate).raw, 15);
});

test('scoreBeginnerSurface - GFI count with stale penalty', () => {
  // 10 GFIs -> 60 base, 0 stale -> 60
  assert.equal(scoreBeginnerSurface(10, 0).raw, 60);

  // 20 GFIs -> capped at 100 base, 50% stale -> 50
  assert.equal(scoreBeginnerSurface(20, 0.5).raw, 50);
});

test('calculateVibeScore - High vibe open source star project', () => {
  const result = calculateVibeScore({
    avgFirstResponseHours: 12,
    newcontributorPrMergeRate: 0.9,
    newcontributorPrSampleSize: 20,
    hasContributing: true,
    hasCodeOfConduct: true,
    hasIssueTemplate: true,
    readmeLength: 2000,
    contributingMentionsSetup: true,
    commitCount30d: 45,
    lastPushedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    goodFirstIssueCount: 15,
    staleGfiRatio: 0.1,
  });

  assert.ok(result.score >= 90, `Expected score >= 90, got ${result.score}`);
  assert.equal(result.confidence, 'high');
});

test('calculateVibeScore - Abandoned project', () => {
  const result = calculateVibeScore({
    avgFirstResponseHours: 500,
    newcontributorPrMergeRate: 0.1,
    newcontributorPrSampleSize: 10,
    hasContributing: false,
    hasCodeOfConduct: false,
    hasIssueTemplate: false,
    readmeLength: 200,
    contributingMentionsSetup: false,
    commitCount30d: 0,
    lastPushedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    goodFirstIssueCount: 0,
    staleGfiRatio: 0,
  });

  assert.ok(result.score <= 25, `Expected score <= 25, got ${result.score}`);
});
