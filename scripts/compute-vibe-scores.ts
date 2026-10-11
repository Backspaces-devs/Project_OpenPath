import { createClient } from '@supabase/supabase-js';
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

async function main() {
  console.log('⚡ Recalculating Vibe Scores for all repositories in database (0 API calls)...');

  const { data: repos, error } = await supabase
    .from('repositories')
    .select('*');

  if (error) {
    console.error('Failed to load repositories:', error);
    process.exit(1);
  }

  if (!repos || repos.length === 0) {
    console.log('No repositories found in database.');
    return;
  }

  console.log(`Recalculating scores for ${repos.length} repositories...`);

  let updated = 0;
  for (const repo of repos) {
    const vibeResult = calculateVibeScore({
      avgFirstResponseHours: repo.avg_first_response_hours,
      newcontributorPrMergeRate: repo.newcontributor_pr_merge_rate,
      newcontributorPrSampleSize: repo.newcontributor_pr_sample_size,
      hasContributing: repo.has_contributing || false,
      hasCodeOfConduct: repo.has_code_of_conduct || false,
      hasIssueTemplate: repo.has_issue_template || false,
      readmeLength: repo.readme_excerpt?.length || 0,
      contributingMentionsSetup: true,
      commitCount30d: repo.commit_frequency_30d || 0,
      lastPushedAt: repo.last_pushed_at,
      goodFirstIssueCount: repo.good_first_issue_count || 0,
      staleGfiRatio: repo.stale_gfi_count && repo.good_first_issue_count ? repo.stale_gfi_count / repo.good_first_issue_count : 0,
    });

    await supabase
      .from('repositories')
      .update({
        vibe_score: vibeResult.score,
        vibe_breakdown: vibeResult.breakdown,
      })
      .eq('id', repo.id);

    updated++;
  }

  console.log(`✅ Successfully updated ${updated} repository Vibe Scores.`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
