import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Setup GitHub token rotation
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
  return new Octokit({ auth: token, userAgent: 'OpenPath-Seed/1.0' });
}

function rotateToken(): void {
  if (tokenPool.length > 1) {
    currentTokenIndex = (currentTokenIndex + 1) % tokenPool.length;
    console.log(`[Seed] Rotated to token #${currentTokenIndex + 1}/${tokenPool.length}`);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const LANGUAGES = [
  'python',
  'javascript',
  'typescript',
  'go',
  'rust',
  'java',
  'cpp',
  'c',
  'ruby',
  'kotlin',
  'swift',
  'php',
];

const LABELS = ['good first issue', 'help wanted', 'hacktoberfest'];
const STAR_BUCKETS = ['100..1000', '1000..10000', '>10000'];

async function main() {
  console.log('=============================================');
  console.log('🚀 OpenPath — Live Repository Seed Pipeline');
  console.log(`Using ${tokenPool.length} GitHub token(s)`);
  console.log('Target: 800 - 1500 real open-source repositories');
  console.log('=============================================\n');

  // Calculate 180 days ago threshold
  const date180DaysAgo = new Date();
  date180DaysAgo.setDate(date180DaysAgo.getDate() - 180);
  const pushedThreshold = date180DaysAgo.toISOString().split('T')[0];

  let totalDiscovered = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const language of LANGUAGES) {
    for (const label of LABELS) {
      for (const stars of STAR_BUCKETS) {
        const query = `language:${language} stars:${stars} pushed:>=${pushedThreshold} is:public fork:false archived:false`;
        console.log(`\n🔍 Searching: ${query} (label: "${label}")...`);

        let page = 1;
        const maxPages = 2; // Fetch top 60 repos per combination to avoid rate-limiting

        while (page <= maxPages) {
          try {
            const octokit = getOctokit();
            const { data } = await octokit.rest.search.repos({
              q: query,
              sort: 'stars',
              order: 'desc',
              per_page: 30,
              page,
            });

            if (!data.items || data.items.length === 0) {
              break;
            }

            for (const repo of data.items) {
              totalDiscovered++;

              // Check if repo already exists in Supabase
              const { data: existing } = await supabase
                .from('repositories')
                .select('id')
                .eq('github_id', repo.id)
                .maybeSingle();

              if (existing) {
                totalSkipped++;
                continue;
              }

              // Insert fresh repo with sync_status = 'pending'
              const { error: insertError } = await supabase.from('repositories').insert({
                github_id: repo.id,
                owner: repo.owner?.login || '',
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description,
                html_url: repo.html_url,
                homepage: repo.homepage || null,
                primary_language: repo.language || language,
                topics: repo.topics || [],
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                watchers: repo.watchers_count,
                open_issues_count: repo.open_issues_count,
                license: repo.license?.name || null,
                size_kb: repo.size,
                is_archived: repo.archived,
                is_fork: repo.fork,
                created_at_github: repo.created_at,
                last_pushed_at: repo.pushed_at,
                sync_status: 'pending',
                last_synced_at: new Date().toISOString(),
              });

              if (insertError) {
                console.warn(`  ⚠️ Failed to insert ${repo.full_name}: ${insertError.message}`);
              } else {
                totalInserted++;
                process.stdout.write(`  ✓ Added [${totalInserted}] ${repo.full_name}\n`);
              }
            }

            // Respect GitHub Search API rate limit (max 30 req/min -> wait 2.5s)
            await sleep(2500);
            page++;
          } catch (error: unknown) {
            const err = error as { status?: number; message?: string };
            console.warn(`  ⚠️ Search error: ${err.message || error}`);

            if (err.status === 403 || err.status === 429) {
              rotateToken();
              await sleep(5000);
            } else {
              break;
            }
          }
        }
      }
    }
  }

  console.log('\n=============================================');
  console.log('✅ Seed Complete!');
  console.log(`Discovered: ${totalDiscovered}`);
  console.log(`Inserted (Pending sync): ${totalInserted}`);
  console.log(`Already existed: ${totalSkipped}`);
  console.log('Run `npm run sync` to compute Vibe Scores & sync metrics.');
  console.log('=============================================\n');
}

main().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
