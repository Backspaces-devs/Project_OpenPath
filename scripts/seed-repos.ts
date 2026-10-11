/**
 * Seed `repositories` with real repositories from the GitHub Search API.
 *
 *   npx tsx scripts/seed-repos.ts
 *   npx tsx scripts/seed-repos.ts --target=1500 --languages="Rust,Go" --pages=2
 *   npx tsx scripts/seed-repos.ts --dry-run
 *
 * The grid is 12 languages × 4 facets × 3 star buckets. Results are deduped by
 * `github_id`, filtered (no archives, no forks, pushed within 180 days) and
 * inserted with `sync_status = 'pending'` for `sync-repos.ts` to enrich.
 *
 * Resumable: repositories already in the database are skipped, and completed
 * query combinations are recorded in `.cache/seed-state.json`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadEnv, log, parseFlags, flagNumber, flagString, flagBool } from "./_env";
import { adminClient, existingGithubIds } from "./_db";
import { GitHubClient } from "../src/lib/github/client";
import { GitHubSearchReposResponseSchema, type GitHubRepository } from "../src/lib/github/types";
import { daysSince, chunk, unique } from "../src/lib/utils";

loadEnv();

const STATE_PATH = resolve(import.meta.dirname, "../.cache/seed-state.json");

const LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "C#",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
];

/** Four discovery facets — beginner signals plus broad discovery. */
const FACETS = [
  { id: "gfi", qualifier: "good-first-issues:>0" },
  { id: "help-wanted", qualifier: "help-wanted-issues:>0" },
  { id: "both", qualifier: "good-first-issues:>0 help-wanted-issues:>0" },
  { id: "broad", qualifier: "" },
];

const STAR_BUCKETS = [
  { id: "100-1k", qualifier: "stars:100..1000" },
  { id: "1k-10k", qualifier: "stars:1000..10000" },
  { id: "10k-100k", qualifier: "stars:10000..100000" },
];

const MAX_PUSH_AGE_DAYS = 180;

interface SeedState {
  completed: string[];
}

function readState(): SeedState {
  try {
    if (existsSync(STATE_PATH)) return JSON.parse(readFileSync(STATE_PATH, "utf8")) as SeedState;
  } catch {
    // Corrupt state file — start over rather than crash.
  }
  return { completed: [] };
}

function writeState(state: SeedState): void {
  mkdirSync(resolve(STATE_PATH, ".."), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function rowFromRepo(repo: GitHubRepository) {
  return {
    github_id: repo.id,
    node_id: repo.node_id ?? null,
    owner: repo.owner.login,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description ?? null,
    homepage: repo.homepage && repo.homepage.trim() !== "" ? repo.homepage : null,
    html_url: repo.html_url,
    default_branch: repo.default_branch,
    primary_language: repo.language ?? null,
    topics: repo.topics ?? [],
    license_spdx: repo.license?.spdx_id ?? repo.license?.key ?? null,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.watchers_count ?? 0,
    open_issues: repo.open_issues_count,
    subscribers: repo.subscribers_count ?? null,
    has_license: Boolean(repo.license),
    is_archived: repo.archived,
    is_fork: repo.fork,
    repo_created_at: repo.created_at,
    pushed_at: repo.pushed_at,
    repo_updated_at: repo.updated_at,
    sync_status: "pending" as const,
    last_synced_at: null,
  };
}

async function main() {
  const flags = parseFlags();
  const target = flagNumber(flags, "target", 1_200);
  const pages = Math.max(1, Math.min(3, flagNumber(flags, "pages", 1)));
  const perPage = 100;
  const dryRun = flagBool(flags, "dry-run");
  const reset = flagBool(flags, "reset");

  const languageFilter = flagString(flags, "languages", "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const languages = languageFilter.length > 0 ? languageFilter : LANGUAGES;

  const client = dryRun ? null : adminClient();
  const github = new GitHubClient(readTokens());

  log.title("OpenPath · seed repositories");
  log.info(
    `${languages.length} languages × ${FACETS.length} facets × ${STAR_BUCKETS.length} star buckets` +
      `${pages > 1 ? ` × ${pages} page(s)` : ""} → target ${target} repos`,
  );
  log.info(github.isAuthenticated ? "GitHub: authenticated" : "GitHub: anonymous (60 req/hour)");
  if (dryRun) log.warn("Dry run — nothing will be written.");

  const state = reset ? { completed: [] } : readState();
  const completed = new Set(state.completed);
  const seen = new Set<number>();
  const collected: GitHubRepository[] = [];

  if (client && !dryRun) {
    const existing = await existingGithubIds(client);
    for (const id of existing) seen.add(id);
    if (existing.size > 0) log.info(`${existing.size} repositories already stored — those are skipped.`);
  }

  const queries: Array<{ key: string; q: string }> = [];
  for (const language of languages) {
    for (const facet of FACETS) {
      for (const bucket of STAR_BUCKETS) {
        const key = `${language}|${facet.id}|${bucket.id}`;
        if (completed.has(key)) continue;
        const parts = [
          `language:"${language}"`,
          "is:public",
          "archived:false",
          "mirror:false",
          bucket.qualifier,
          facet.qualifier,
        ].filter(Boolean);
        queries.push({ key, q: parts.join(" ") });
      }
    }
  }

  log.step(`${queries.length} search queries to run (${completed.size} already done)`);

  let queryIndex = 0;
  for (const { key, q } of queries) {
    if (collected.length >= target) break;
    queryIndex += 1;

    for (let page = 1; page <= pages; page++) {
      try {
        const { data } = await github.request("/search/repositories", {
          schema: GitHubSearchReposResponseSchema,
          bucket: "search",
          query: { q, sort: "stars", order: "desc", page, per_page: perPage },
        });

        for (const repo of data.items) {
          if (seen.has(repo.id)) continue;
          seen.add(repo.id);
          if (repo.archived || repo.fork) continue;
          const age = daysSince(repo.pushed_at);
          if (age === null || age > MAX_PUSH_AGE_DAYS) continue;
          collected.push(repo);
        }

        if (data.items.length < perPage) break;
      } catch (error) {
        log.warn(`  ${key} page ${page} failed: ${error instanceof Error ? error.message : error}`);
        break;
      }
    }

    completed.add(key);
    if (queryIndex % 12 === 0 || collected.length >= target) {
      log.info(`  ${queryIndex}/${queries.length} · ${collected.length} candidates`);
      if (!dryRun) writeState({ completed: [...completed] });
    }

    if (collected.length >= target) break;
  }

  if (!dryRun) writeState({ completed: [...completed] });

  const rows = collected.slice(0, target).map(rowFromRepo);
  log.step(`${rows.length} repositories pass the filters`);

  if (dryRun || !client) {
    for (const repo of rows.slice(0, 15)) log.info(`  ${repo.full_name} · ${repo.stars}★`);
    if (rows.length > 15) log.info(`  …and ${rows.length - 15} more`);
    log.ok("Dry run complete.");
    return;
  }

  let inserted = 0;
  for (const batch of chunk(rows, 200)) {
    const { error } = await client
      .from("repositories")
      .upsert(batch, { onConflict: "github_id", ignoreDuplicates: true });

    if (error) {
      log.fail(`Insert failed: ${error.message}`);
      continue;
    }
    inserted += batch.length;
    log.info(`  inserted ${inserted}/${rows.length}`);
  }

  log.ok(`Seeded ${inserted} repositories with sync_status = 'pending'.`);
  log.info("Next: npx tsx scripts/sync-repos.ts");
}

function readTokens(): string[] {
  const raw = process.env.GITHUB_TOKEN_POOL ?? process.env.GITHUB_TOKEN ?? "";
  return unique(
    raw
      .split(/[,\s]+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

main().catch((error) => {
  log.fail(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack && process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
});
