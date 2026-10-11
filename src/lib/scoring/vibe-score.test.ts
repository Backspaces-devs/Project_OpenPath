import assert from "node:assert/strict";
import test from "node:test";

import { calculateVibeScore } from "@/lib/scoring/vibe-score";
import type { RepoMetrics } from "@/lib/scoring/types";

/** A repo that does everything right. */
const PERFECT: RepoMetrics = {
  stars: 50_000,
  forks: 4_000,
  openIssues: 50,
  topicsCount: 12,
  descriptionLength: 300,
  watchers: 2_000,
  subscribers: 1_500,
  contributors: 300,
  commitsLast90Days: 400,
  commitsLastYear: 1_800,
  daysSinceLastPush: 0,
  daysSinceCreation: 2_000,
  goodFirstIssues: 40,
  helpWantedIssues: 20,
  closedIssues: 900,
  mergedPullRequests: 800,
  totalPullRequests: 900,
  medianIssueCloseHours: 6,
  hasReadme: true,
  hasLicense: true,
  hasContributing: true,
  hasCodeOfConduct: true,
  hasHomepage: true,
  archived: false,
  isFork: false,
};

/** A repo nobody has touched in years. */
const ABANDONED: RepoMetrics = {
  stars: 12,
  forks: 3,
  openIssues: 40,
  topicsCount: 0,
  descriptionLength: 0,
  watchers: 2,
  subscribers: 1,
  contributors: 1,
  commitsLast90Days: 0,
  commitsLastYear: 0,
  daysSinceLastPush: 900,
  daysSinceCreation: 3_000,
  goodFirstIssues: 0,
  helpWantedIssues: 0,
  closedIssues: 2,
  mergedPullRequests: 0,
  totalPullRequests: 5,
  medianIssueCloseHours: 5_000,
  hasReadme: false,
  hasLicense: false,
  hasContributing: false,
  hasCodeOfConduct: false,
  hasHomepage: false,
  archived: false,
  isFork: false,
};

/** Only what the GitHub search API returns — no sync has happened yet. */
const PARTIAL: RepoMetrics = {
  stars: 1_200,
  forks: 90,
  openIssues: 30,
  topicsCount: 6,
  descriptionLength: 140,
  watchers: null,
  subscribers: null,
  contributors: null,
  commitsLast90Days: null,
  daysSinceLastPush: 4,
  hasLicense: true,
  hasHomepage: true,
};

test("a healthy, well-run repo scores 90 or above with full confidence", () => {
  const result = calculateVibeScore(PERFECT);

  assert.ok(result.score >= 90, `expected >= 90, got ${result.score}`);
  assert.ok(result.score <= 100);
  assert.equal(result.confidence, 1);
  assert.equal(result.grade, "exceptional");
  assert.equal(result.availableComponents.length, 5);
});

test("an abandoned repo scores at the bottom of the range", () => {
  const result = calculateVibeScore(ABANDONED);

  assert.ok(result.score <= 35, `expected <= 35, got ${result.score}`);
  assert.ok(result.score >= 0);
  assert.equal(result.grade, "quiet");
  assert.ok(result.breakdown.activity.score < 5);
  assert.equal(result.breakdown.clarity.score, 0);
  assert.equal(result.breakdown.beginnerFriendliness.score, 0);
});

test("partial data still scores, but says so through confidence", () => {
  const result = calculateVibeScore(PARTIAL);

  assert.ok(result.score > 0 && result.score < 100, `expected 0 < score < 100, got ${result.score}`);
  assert.ok(result.confidence < 0.6, `expected confidence < 0.6, got ${result.confidence}`);
  assert.ok(!result.availableComponents.includes("responsiveness"));
  assert.ok(!result.availableComponents.includes("beginnerFriendliness"));
  assert.ok(result.availableComponents.includes("community"));
});

test("a repo with nothing at all degrades to zero instead of NaN", () => {
  const result = calculateVibeScore({});

  assert.equal(result.score, 0);
  // Stars/topics/description default to zero, so we are not fully blind.
  assert.ok(result.confidence < 0.25, `expected confidence < 0.25, got ${result.confidence}`);
  assert.deepEqual(result.availableComponents, ["community", "clarity"]);
  assert.ok(Number.isFinite(result.score));
});

test("stars move the community component in one direction only", () => {
  let previous = -1;
  for (const stars of [0, 10, 100, 1_000, 10_000, 100_000]) {
    const result = calculateVibeScore({ ...PARTIAL, stars });
    const community = result.breakdown.community.score;
    assert.ok(community >= previous, `community dropped at stars=${stars}`);
    previous = community;
  }
});

test("archived repos are pinned near zero on activity even if pushed yesterday", () => {
  const result = calculateVibeScore({
    ...PERFECT,
    archived: true,
    daysSinceLastPush: 0,
    commitsLast90Days: 500,
  });

  assert.ok(result.breakdown.activity.score <= 5);
  assert.ok(result.score < calculateVibeScore(PERFECT).score);
});

test("forks lose a few points to the original repo", () => {
  const original = calculateVibeScore(PERFECT);
  const forked = calculateVibeScore({ ...PERFECT, isFork: true });

  assert.ok(forked.score < original.score);
  assert.ok(original.score - forked.score <= 5);
});

test("every weight still sums to the available mass after redistribution", () => {
  const result = calculateVibeScore(PARTIAL);
  const total = result.availableComponents.reduce(
    (sum, component) => sum + result.breakdown[component].effectiveWeight,
    0,
  );

  assert.ok(Math.abs(total - 1) < 0.01, `effective weights summed to ${total}`);
});

test("the score stays inside 0–100 for hostile inputs", () => {
  const hostile: RepoMetrics[] = [
    { stars: Number.MAX_SAFE_INTEGER, forks: 0, openIssues: 0, descriptionLength: 100_000, topicsCount: 500 },
    { stars: 0, forks: 0, openIssues: 0, daysSinceLastPush: 0, closedIssues: 0, mergedPullRequests: 0, totalPullRequests: 0 },
    { stars: 5, closedIssues: 0, openIssues: 0, medianIssueCloseHours: 0, hasLicense: false },
    { ...PERFECT, daysSinceLastPush: -10, medianIssueCloseHours: -5 },
  ];

  for (const metrics of hostile) {
    const result = calculateVibeScore(metrics);
    assert.ok(Number.isFinite(result.score), "score must be finite");
    assert.ok(result.score >= 0 && result.score <= 100, `score out of range: ${result.score}`);
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
  }
});

test("bad input is rejected loudly rather than silently coerced", () => {
  assert.throws(
    () => calculateVibeScore({ stars: -5 } as RepoMetrics),
    /Invalid RepoMetrics/,
  );
});
