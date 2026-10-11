/**
 * Recompute every Vibe Score from metrics already stored in Supabase.
 *
 *   npx tsx scripts/compute-vibe-scores.ts
 *   npx tsx scripts/compute-vibe-scores.ts --dry-run
 *   npx tsx scripts/compute-vibe-scores.ts --only-missing
 *
 * No GitHub API calls, so this is the safe way to re-score after changing the
 * weights in `src/lib/scoring/vibe-score.ts`.
 */
import { loadEnv, log, parseFlags, flagBool } from "./_env";
import { adminClient } from "./_db";
import { calculateVibeScore } from "../src/lib/scoring/vibe-score";
import type { RepoMetrics } from "../src/lib/scoring/types";
import type { RepositoryRow } from "../src/lib/supabase/types";
import { chunk } from "../src/lib/utils";

loadEnv();

const COLUMNS =
  "id, full_name, stars, forks, open_issues, watchers, subscribers, contributors_count, commits_last_90d, commits_last_year, closed_issues, merged_pull_requests, median_issue_close_hours, good_first_issues, help_wanted_issues, topics, description, homepage, has_readme, has_contributing, has_code_of_conduct, has_license, is_archived, is_fork, repo_created_at, pushed_at, vibe_score";

async function main() {
  const flags = parseFlags();
  const dryRun = flagBool(flags, "dry-run");
  const onlyMissing = flagBool(flags, "only-missing");
  const pageSize = 500;

  const client = adminClient();

  log.title("OpenPath · recompute Vibe Scores");
  if (dryRun) log.warn("Dry run — nothing will be written.");
  log.info(onlyMissing ? "Only rows without a score." : "All rows.");

  let updated = 0;
  let scanned = 0;
  const top: Array<{ full_name: string; score: number }> = [];

  for (let from = 0; ; from += pageSize) {
    let query = client
      .from("repositories")
      .select(COLUMNS)
      .range(from, from + pageSize - 1);

    if (onlyMissing) query = query.is("vibe_score", null);

    const { data, error } = await query;
    if (error) throw new Error(`Could not read repositories: ${error.message}`);
    if (!data || data.length === 0) break;

    const rows = data as RepositoryRow[];
    scanned += rows.length;

    const updates = rows.map((row) => {
      const metrics: RepoMetrics = {
        stars: row.stars,
        forks: row.forks,
        openIssues: row.open_issues,
        watchers: row.watchers ?? null,
        subscribers: row.subscribers ?? null,
        contributors: row.contributors_count ?? null,
        commitsLast90Days: row.commits_last_90d ?? null,
        commitsLastYear: row.commits_last_year ?? null,
        daysSinceLastPush: row.pushed_at ? daysBetween(row.pushed_at) : null,
        daysSinceCreation: row.repo_created_at ? daysBetween(row.repo_created_at) : null,
        goodFirstIssues: row.good_first_issues ?? null,
        helpWantedIssues: row.help_wanted_issues ?? null,
        closedIssues: row.closed_issues ?? null,
        mergedPullRequests: row.merged_pull_requests ?? null,
        totalPullRequests: null,
        medianIssueCloseHours: row.median_issue_close_hours ? Number(row.median_issue_close_hours) : null,
        topicsCount: row.topics?.length ?? 0,
        descriptionLength: row.description?.length ?? 0,
        hasReadme: row.has_readme ?? null,
        hasLicense: row.has_license ?? null,
        hasContributing: row.has_contributing ?? null,
        hasCodeOfConduct: row.has_code_of_conduct ?? null,
        hasHomepage: Boolean(row.homepage),
        archived: row.is_archived,
        isFork: row.is_fork,
      };

      const vibe = calculateVibeScore(metrics);
      top.push({ full_name: row.full_name, score: vibe.score });

      return {
        id: row.id,
        vibe_score: vibe.score,
        vibe_breakdown: vibe.breakdown,
        vibe_confidence: vibe.confidence,
        vibe_computed_at: new Date().toISOString(),
      };
    });

    if (!dryRun) {
      for (const batch of chunk(updates, 200)) {
        const { error: writeError } = await client
          .from("repositories")
          .upsert(batch, { onConflict: "id" });
        if (writeError) log.fail(`Write failed: ${writeError.message}`);
      }
    }

    updated += updates.length;
    log.info(`  ${scanned} rows scanned`);
    if (rows.length < pageSize) break;
  }

  top.sort((a, b) => b.score - a.score);
  log.title(`Top ${Math.min(10, top.length)} by Vibe Score`);
  for (const entry of top.slice(0, 10)) {
    log.info(`  ${entry.score.toFixed(1).padStart(5)}  ${entry.full_name}`);
  }

  log.ok(`${dryRun ? "Would update" : "Updated"} ${updated} repositories.`);
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
