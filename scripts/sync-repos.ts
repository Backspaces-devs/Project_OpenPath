/**
 * Enrich pending repositories with full metrics and compute their Vibe Score.
 *
 *   npx tsx scripts/sync-repos.ts
 *   npx tsx scripts/sync-repos.ts --limit=200 --concurrency=8
 *   npx tsx scripts/sync-repos.ts --refresh        # also re-sync stale rows
 *   npx tsx scripts/sync-repos.ts --dry-run
 *
 * Idempotent: rows are re-derived from GitHub every time and `sync_status` is
 * set to `synced` on success, `failed` with a message on error. Re-running only
 * touches rows that are not yet synced (or stale ones with `--refresh`).
 */
import { loadEnv, log, parseFlags, flagNumber, flagBool } from "./_env";
import { adminClient, fetchPendingRepos, startSyncLog, finishSyncLog, type PendingRepo } from "./_db";
import { GitHubClient } from "../src/lib/github/client";
import { RateLimitError } from "../src/lib/errors";
import { getGitHubClient } from "../src/lib/github/client";
import { calculateVibeScore } from "../src/lib/scoring/vibe-score";
import type { RepoMetrics } from "../src/lib/scoring/types";
import { chunk } from "../src/lib/utils";

loadEnv();

async function main() {
  const flags = parseFlags();
  const limit = flagNumber(flags, "limit", 500);
  const batchSize = flagNumber(flags, "batch", 25);
  const concurrency = Math.max(1, Math.min(16, flagNumber(flags, "concurrency", 5)));
  const dryRun = flagBool(flags, "dry-run");
  const refresh = flagBool(flags, "refresh");

  const client = dryRun ? null : adminClient();
  const github: GitHubClient = getGitHubClient();

  log.title("OpenPath · sync repositories");
  log.info(github.isAuthenticated ? "GitHub: authenticated" : "GitHub: anonymous (60 req/hour)");
  if (refresh) log.info("Refresh mode: rows older than 6 hours will be re-synced.");
  if (dryRun) log.warn("Dry run — nothing will be written.");

  const logId = client && !dryRun ? await startSyncLog(client, "sync-repos") : null;
  const pending: PendingRepo[] = client
    ? await fetchPendingRepos(client, limit, { includeSynced: refresh })
    : [];

  if (pending.length === 0) {
    log.ok("Nothing to sync — every repository is up to date.");
    log.info("Seed more with: npx tsx scripts/seed-repos.ts");
    if (client && logId) await finishSyncLog(client, logId, { status: "success", repos_processed: 0 });
    return;
  }

  log.step(`${pending.length} repositories queued (batches of ${batchSize}, ${concurrency} at a time)`);

  let processed = 0;
  let failed = 0;
  let rateLimited = false;

  for (const batch of chunk(pending, batchSize)) {
    if (rateLimited) break;
    log.info(`Batch ${Math.floor(processed / batchSize) + 1} · ${batch.length} repos`);

    for (const slice of chunk(batch, concurrency)) {
      const results = await Promise.allSettled(slice.map((repo) => syncOne(github, repo)));

      const updates: Array<Record<string, unknown>> = [];
      const issueRows: Array<Record<string, unknown>> = [];

      results.forEach((result, index) => {
        const repo = slice[index];
        if (result.status === "fulfilled") {
          updates.push({ id: repo.id, ...result.value.update });
          issueRows.push(...result.value.issues.map((issue) => ({ ...issue, repo_id: repo.id })));
          log.info(`  ✓ ${repo.full_name} · vibe ${result.value.vibeScore}`);
        } else {
          failed += 1;
          const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
          if (result.reason instanceof RateLimitError) {
            rateLimited = true;
            log.warn(`  ! rate limited — stopping cleanly, re-run to continue`);
          } else {
            log.warn(`  ✗ ${repo.full_name}: ${message}`);
          }
          updates.push({
            id: repo.id,
            sync_status: "failed",
            sync_error: message.slice(0, 500),
            last_synced_at: new Date().toISOString(),
          });
        }
        processed += 1;
      });

      if (client && !dryRun) {
        if (updates.length > 0) {
          const { error } = await client.from("repositories").upsert(updates, { onConflict: "id" });
          if (error) log.fail(`Could not write batch: ${error.message}`);
        }

        if (issueRows.length > 0) {
          const { error } = await client
            .from("issues")
            .upsert(issueRows, { onConflict: "github_id", ignoreDuplicates: false });
          if (error) log.fail(`Could not write issues: ${error.message}`);
        }
      }

      if (rateLimited) break;
    }

    if (rateLimited) break;
  }

  log.title("Summary");
  log.ok(`${processed} processed · ${failed} failed`);

  if (client && logId) {
    await finishSyncLog(client, logId, {
      status: rateLimited ? "failed" : "success",
      repos_processed: processed,
      repos_failed: failed,
      error: rateLimited ? "rate limited" : null,
    });
  }

  if (rateLimited) process.exitCode = 1;
}

async function syncOne(github: GitHubClient, repo: PendingRepo) {
  const { owner, name } = repo;
  const since90 = new Date(Date.now() - 90 * 86_400_000);
  const since365 = new Date(Date.now() - 365 * 86_400_000);

  const { GitHubRepositorySchema, GitHubContributorSchema, GitHubCommitSchema, GitHubIssueSchema, GitHubSearchIssuesResponseSchema } =
    await import("../src/lib/github/types");
  const { detectDocs } = await import("../src/lib/github/fetchers");

  const [repoResponse, contributors, commits90, commits365, closed, gfi, helpWanted, rootFiles, githubDirFiles] =
    await Promise.all([
      github.requestCached(`/repos/${owner}/${name}`, {
        schema: GitHubRepositorySchema,
        key: `repo:${owner}/${name}`,
        maxAgeMs: 6 * 3_600_000,
      }),
      github.request(`/repos/${owner}/${name}/contributors`, {
        schema: GitHubContributorSchema.array(),
        query: { per_page: 100 },
      }).catch(() => ({ data: [] as Array<unknown> })),
      github.request(`/repos/${owner}/${name}/commits`, {
        schema: GitHubCommitSchema.array(),
        query: { per_page: 100, since: since90.toISOString() },
      }).catch(() => ({ data: [] as Array<unknown> })),
      github.request(`/repos/${owner}/${name}/commits`, {
        schema: GitHubCommitSchema.array(),
        query: { per_page: 1, since: since365.toISOString() },
      }).catch(() => ({ data: [] as Array<unknown> })),
      github.request(`/repos/${owner}/${name}/issues`, {
        schema: GitHubIssueSchema.array(),
        query: { state: "closed", per_page: 100, sort: "updated", direction: "desc" },
      }).catch(() => ({ data: [] as Array<unknown> })),
      github
        .request("/search/issues", {
          schema: GitHubSearchIssuesResponseSchema,
          bucket: "search",
          query: { q: `repo:${owner}/${name} is:issue is:open label:"good first issue"`, per_page: 20 },
        })
        .catch(() => ({ data: { total_count: 0, items: [] } })),
      github
        .request("/search/issues", {
          schema: GitHubSearchIssuesResponseSchema,
          bucket: "search",
          query: { q: `repo:${owner}/${name} is:issue is:open label:"help wanted"`, per_page: 1 },
        })
        .catch(() => ({ data: { total_count: 0, items: [] } })),
      listFiles(github, owner, name, ""),
      listFiles(github, owner, name, ".github"),
    ]);

  const full = repoResponse.data as unknown as {
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    watchers_count: number;
    subscribers_count: number | null;
    description: string | null;
    homepage: string | null;
    topics: string[];
    license: { spdx_id?: string | null; key?: string | null } | null;
    pushed_at: string;
    created_at: string;
    updated_at: string;
    default_branch: string;
    is_archived?: boolean;
    archived: boolean;
    fork: boolean;
    html_url: string;
  };

  const docs = detectDocs([...rootFiles, ...githubDirFiles]);

  const contributorList = contributors.data as Array<{ login: string }>;
  const commits90List = commits90.data as Array<unknown>;
  const commits365List = commits365.data as Array<unknown>;
  const closedList = closed.data as Array<{ created_at: string; closed_at: string | null }>;
  const gfiItems = (gfi.data.items ?? []) as Array<Record<string, unknown>>;

  const metrics: RepoMetrics = {
    stars: full.stargazers_count,
    forks: full.forks_count,
    openIssues: full.open_issues_count,
    watchers: full.watchers_count ?? null,
    subscribers: full.subscribers_count ?? null,
    contributors: contributorList.length > 0 ? contributorList.length : null,
    commitsLast90Days: commits90List.length,
    commitsLastYear: commits365List.length > 0 ? Math.max(commits365List.length, commits90List.length) : null,
    daysSinceLastPush: daysBetween(full.pushed_at),
    daysSinceCreation: daysBetween(full.created_at),
    goodFirstIssues: gfi.data.total_count ?? gfiItems.length,
    helpWantedIssues: helpWanted.data.total_count ?? 0,
    closedIssues: closedList.length,
    mergedPullRequests: null,
    totalPullRequests: null,
    medianIssueCloseHours: medianCloseTime(closedList),
    topicsCount: full.topics?.length ?? 0,
    descriptionLength: full.description?.length ?? 0,
    hasReadme: docs.readme,
    hasLicense: docs.license || Boolean(full.license),
    hasContributing: docs.contributing,
    hasCodeOfConduct: docs.codeOfConduct,
    hasHomepage: Boolean(full.homepage),
    archived: full.archived,
    isFork: full.fork,
  };

  const vibe = calculateVibeScore(metrics);

  const issues = gfiItems.map((issue) => ({
    github_id: Number(issue.id),
    repo_full_name: `${owner}/${name}`,
    number: Number(issue.number),
    title: String(issue.title ?? ""),
    body: typeof issue.body === "string" ? issue.body.slice(0, 8_000) : null,
    state: "open",
    is_pull_request: false,
    labels: (issue.labels as Array<{ name: string }> | undefined)?.map((label) => label.name) ?? [],
    is_good_first_issue: true,
    is_help_wanted: false,
    comments: Number(issue.comments ?? 0),
    author: (issue.user as { login?: string } | undefined)?.login ?? null,
    html_url: String(issue.html_url ?? ""),
    github_created_at: typeof issue.created_at === "string" ? issue.created_at : null,
    github_updated_at: typeof issue.updated_at === "string" ? issue.updated_at : null,
    synced_at: new Date().toISOString(),
  }));

  const update = {
    description: full.description,
    homepage: full.homepage || null,
    html_url: full.html_url,
    default_branch: full.default_branch,
    primary_language: (full as { language?: string | null }).language ?? null,
    topics: full.topics ?? [],
    license_spdx: full.license?.spdx_id ?? full.license?.key ?? null,
    stars: full.stargazers_count,
    forks: full.forks_count,
    watchers: full.watchers_count ?? 0,
    open_issues: full.open_issues_count,
    subscribers: full.subscribers_count ?? null,
    contributors_count: contributorList.length > 0 ? contributorList.length : null,
    commits_last_90d: commits90List.length,
    commits_last_year: metrics.commitsLastYear ?? null,
    closed_issues: closedList.length,
    merged_pull_requests: metrics.mergedPullRequests ?? null,
    median_issue_close_hours: metrics.medianIssueCloseHours ?? null,
    good_first_issues: metrics.goodFirstIssues ?? 0,
    help_wanted_issues: metrics.helpWantedIssues ?? 0,
    has_readme: docs.readme,
    has_contributing: docs.contributing,
    has_code_of_conduct: docs.codeOfConduct,
    has_license: docs.license || metrics.hasLicense === true,
    is_archived: full.archived,
    is_fork: full.fork,
    repo_created_at: full.created_at,
    pushed_at: full.pushed_at,
    repo_updated_at: full.updated_at,
    vibe_score: vibe.score,
    vibe_breakdown: vibe.breakdown,
    vibe_confidence: vibe.confidence,
    vibe_computed_at: new Date().toISOString(),
    sync_status: "synced",
    sync_error: null,
    last_synced_at: new Date().toISOString(),
  };

  return { update, issues, vibeScore: vibe.score };
}

async function listFiles(github: GitHubClient, owner: string, repo: string, path: string): Promise<string[]> {
  const { getRepoContents } = await import("../src/lib/github/fetchers");
  try {
    return await getRepoContents(owner, repo, path);
  } catch {
    // A missing or unreadable listing should not fail the whole sync.
    return [];
  }
}

function medianCloseTime(issues: Array<{ created_at: string; closed_at: string | null }>): number | null {
  const durations = issues
    .map((issue) => {
      if (!issue.closed_at) return null;
      const created = Date.parse(issue.created_at);
      const closed = Date.parse(issue.closed_at);
      if (Number.isNaN(created) || Number.isNaN(closed)) return null;
      return (closed - created) / 3_600_000;
    })
    .filter((value): value is number => value !== null && value >= 0)
    .sort((a, b) => a - b);

  if (durations.length === 0) return null;
  const middle = Math.floor(durations.length / 2);
  return durations.length % 2 === 0 ? (durations[middle - 1] + durations[middle]) / 2 : durations[middle];
}

function daysBetween(iso: string): number {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
}

main().catch((error) => {
  log.fail(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack && process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
});
