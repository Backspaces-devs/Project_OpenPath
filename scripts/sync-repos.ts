import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';
import { calculateVibeScore } from '../src/lib/scoring/vibe-score';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tokenPool = (process.env.GITHUB_TOKEN_POOL || process.env.GITHUB_TOKEN || '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

if (tokenPool.length === 0) {
  console.error('Error: GITHUB_TOKEN or GITHUB_TOKEN_POOL must be set.');
  process.exit(1);
}

let currentTokenIndex = 0;
function getOctokit(): Octokit {
  const token = tokenPool[currentTokenIndex % tokenPool.length];
  return new Octokit({ auth: token, userAgent: 'OpenPath-Sync/1.0' });
}

function rotateToken(): void {
  if (tokenPool.length > 1) {
    currentTokenIndex = (currentTokenIndex + 1) % tokenPool.length;
    console.log(`[Sync] Rotated to token #${currentTokenIndex + 1}/${tokenPool.length}`);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkFile(octokit: Octokit, owner: string, repo: string, path: string): Promise<boolean> {
  try {
    await octokit.rest.repos.getContent({ owner, repo, path });
    return true;
  } catch {
    return false;
  }
}

async function getFileString(octokit: Octokit, owner: string, repo: string, path: string): Promise<string> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if ('content' in data && typeof data.content === 'string') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return '';
  } catch {
    return '';
  }
}

async function main() {
  const startTime = Date.now();
  console.log('=============================================');
  console.log('🔄 OpenPath — Repository Metric Sync Pipeline');
  console.log('Computing live Vibe Scores, response times, and PR merge rates');
  console.log('=============================================\n');

  // Select repos that are pending or haven't been synced in > 6 hours
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: repos, error } = await supabase
    .from('repositories')
    .select('id, owner, name, full_name, github_id, last_pushed_at')
    .or(`sync_status.eq.pending,last_synced_at.lt.${sixHoursAgo}`)
    .order('sync_status', { ascending: false }) // prioritize pending
    .limit(25);

  if (error) {
    console.error('Failed to fetch repositories to sync:', error);
    process.exit(1);
  }

  if (!repos || repos.length === 0) {
    console.log('✨ All repositories are up-to-date! No sync needed right now.');
    return;
  }

  console.log(`Processing batch of ${repos.length} repositories...\n`);

  let processedCount = 0;
  let apiCallsMade = 0;
  let errorCount = 0;

  for (const repo of repos) {
    const octokit = getOctokit();
    const { owner, name, full_name, id: repoDbId } = repo;

    console.log(`[${processedCount + 1}/${repos.length}] Syncing: ${full_name}...`);

    try {
      // 1. Check documentation files
      const [hasContributing, hasCodeOfConduct, hasIssueTemplate] = await Promise.all([
        checkFile(octokit, owner, name, 'CONTRIBUTING.md'),
        checkFile(octokit, owner, name, 'CODE_OF_CONDUCT.md'),
        checkFile(octokit, owner, name, '.github/ISSUE_TEMPLATE'),
      ]);
      apiCallsMade += 3;

      // 2. Check README content
      const readme = await getFileString(octokit, owner, name, 'README.md');
      apiCallsMade += 1;
      const readmeLength = readme.length;

      // 3. Check if CONTRIBUTING mentions setup/install/test
      let contributingMentionsSetup = false;
      if (hasContributing) {
        const contributingText = await getFileString(octokit, owner, name, 'CONTRIBUTING.md');
        apiCallsMade += 1;
        contributingMentionsSetup = /install|setup|build|test|getting started|run/i.test(contributingText);
      }

      // 4. Commits in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      let commitCount30d = 0;
      try {
        const { data: commits } = await octokit.rest.repos.listCommits({
          owner,
          repo: name,
          since: thirtyDaysAgo,
          per_page: 50,
        });
        apiCallsMade += 1;
        commitCount30d = commits.length;
      } catch {
        commitCount30d = 0;
      }

      // 5. Pull Requests (newcomer merge rate)
      let newcomerMergeRate: number | null = null;
      let sampleSize = 0;
      try {
        const { data: pulls } = await octokit.rest.pulls.list({
          owner,
          repo: name,
          state: 'all',
          per_page: 30,
        });
        apiCallsMade += 1;

        const firstTimerPulls = pulls.filter(
          (p) => p.author_association === 'FIRST_TIME_CONTRIBUTOR' || p.author_association === 'NONE'
        );
        sampleSize = firstTimerPulls.length;

        if (sampleSize > 0) {
          const mergedCount = firstTimerPulls.filter((p) => p.merged_at !== null).length;
          newcomerMergeRate = mergedCount / sampleSize;
        }
      } catch {
        newcomerMergeRate = null;
      }

      // 6. Good First Issues & Stale Ratio
      let goodFirstIssueCount = 0;
      let staleRatio = 0;
      try {
        const { data: issues } = await octokit.rest.issues.listForRepo({
          owner,
          repo: name,
          state: 'open',
          labels: 'good first issue',
          per_page: 30,
        });
        apiCallsMade += 1;
        goodFirstIssueCount = issues.length;

        if (issues.length > 0) {
          const ninetyDaysAgoTime = Date.now() - 90 * 24 * 60 * 60 * 1000;
          const staleCount = issues.filter(
            (i) => new Date(i.updated_at).getTime() < ninetyDaysAgoTime
          ).length;
          staleRatio = staleCount / issues.length;

          // Upsert discovered issues into issues table
          for (const issue of issues) {
            await supabase.from('issues').upsert(
              {
                github_id: issue.id,
                repo_id: repoDbId,
                number: issue.number,
                title: issue.title,
                body: issue.body,
                html_url: issue.html_url,
                state: issue.state,
                labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name || '')),
                is_good_first_issue: true,
                comments_count: issue.comments,
                created_at_github: issue.created_at,
                updated_at_github: issue.updated_at,
                closed_at_github: issue.closed_at,
                assignee_login: issue.assignee?.login || null,
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: 'github_id' }
            );
          }
        }
      } catch {
        goodFirstIssueCount = 0;
      }

      // 7. Calculate Maintainer Response Time (estimated from issue comments)
      let avgResponseHours: number | null = null;
      try {
        const { data: recentIssues } = await octokit.rest.issues.listForRepo({
          owner,
          repo: name,
          state: 'all',
          per_page: 10,
        });
        apiCallsMade += 1;

        const responseDeltas: number[] = [];
        for (const iss of recentIssues.slice(0, 5)) {
          if (iss.comments > 0) {
            const { data: comments } = await octokit.rest.issues.listComments({
              owner,
              repo: name,
              issue_number: iss.number,
              per_page: 5,
            });
            apiCallsMade += 1;

            const maintainerComment = comments.find(
              (c) => c.author_association === 'MEMBER' || c.author_association === 'OWNER'
            );
            if (maintainerComment) {
              const diffHours =
                (new Date(maintainerComment.created_at).getTime() -
                  new Date(iss.created_at).getTime()) /
                (1000 * 60 * 60);
              if (diffHours >= 0) responseDeltas.push(diffHours);
            }
          }
        }

        if (responseDeltas.length > 0) {
          avgResponseHours =
            responseDeltas.reduce((a, b) => a + b, 0) / responseDeltas.length;
        }
      } catch {
        avgResponseHours = null;
      }

      // 8. Calculate Master Vibe Score
      const vibeResult = calculateVibeScore({
        avgFirstResponseHours: avgResponseHours,
        newcontributorPrMergeRate: newcomerMergeRate,
        newcontributorPrSampleSize: sampleSize,
        hasContributing,
        hasCodeOfConduct,
        hasIssueTemplate,
        readmeLength,
        contributingMentionsSetup,
        commitCount30d,
        lastPushedAt: repo.last_pushed_at,
        goodFirstIssueCount,
        staleGfiRatio: staleRatio,
      });

      // 9. Update Database Record
      const { error: updateError } = await supabase
        .from('repositories')
        .update({
          has_contributing: hasContributing,
          has_code_of_conduct: hasCodeOfConduct,
          has_issue_template: hasIssueTemplate,
          good_first_issue_count: goodFirstIssueCount,
          avg_first_response_hours: avgResponseHours,
          newcontributor_pr_merge_rate: newcomerMergeRate,
          newcontributor_pr_sample_size: sampleSize,
          commit_frequency_30d: commitCount30d,
          vibe_score: vibeResult.score,
          vibe_breakdown: vibeResult.breakdown,
          sync_status: 'synced',
          sync_error: null,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', repoDbId);

      if (updateError) {
        throw updateError;
      }

      processedCount++;
      console.log(
        `  ✨ Vibe: ${vibeResult.score}/100 (${vibeResult.confidence}) | GFIs: ${goodFirstIssueCount} | 30d Commits: ${commitCount30d}`
      );
    } catch (err: unknown) {
      errorCount++;
      const errorMessage = (err as Error).message || String(err);
      console.warn(`  ❌ Failed to sync ${full_name}: ${errorMessage}`);

      await supabase
        .from('repositories')
        .update({
          sync_status: 'error',
          sync_error: errorMessage,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', repoDbId);

      rotateToken();
    }

    // Small delay between repos to avoid bursting GitHub API
    await sleep(800);
  }

  // 10. Log run to sync_log
  const durationMs = Date.now() - startTime;
  await supabase.from('sync_log').insert({
    job_name: 'batch_repo_sync',
    repos_processed: processedCount,
    api_calls_made: apiCallsMade,
    errors: errorCount,
    duration_ms: durationMs,
    status: errorCount === 0 ? 'success' : 'completed_with_errors',
  });

  console.log('\n=============================================');
  console.log('✅ Sync Completed!');
  console.log(`Processed: ${processedCount}/${repos.length}`);
  console.log(`API Calls: ${apiCallsMade}`);
  console.log(`Duration: ${Math.round(durationMs / 1000)}s`);
  console.log('=============================================\n');
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
