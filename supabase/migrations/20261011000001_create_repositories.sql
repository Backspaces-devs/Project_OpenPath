CREATE TABLE repositories (
  id bigserial PRIMARY KEY,
  github_id bigint UNIQUE NOT NULL,
  owner text NOT NULL,
  name text NOT NULL,
  full_name text UNIQUE NOT NULL,
  description text,
  html_url text,
  homepage text,
  primary_language text,
  languages jsonb,
  topics text[],
  stars int DEFAULT 0,
  forks int DEFAULT 0,
  watchers int DEFAULT 0,
  open_issues_count int DEFAULT 0,
  license text,
  size_kb int,
  is_archived bool DEFAULT false,
  is_fork bool DEFAULT false,
  has_contributing bool DEFAULT false,
  has_code_of_conduct bool DEFAULT false,
  has_issue_template bool DEFAULT false,
  readme_excerpt text,
  last_pushed_at timestamptz,
  created_at_github timestamptz,
  good_first_issue_count int DEFAULT 0,
  help_wanted_count int DEFAULT 0,
  stale_gfi_count int DEFAULT 0,
  avg_first_response_hours numeric,
  newcontributor_pr_merge_rate numeric,
  newcontributor_pr_sample_size int,
  commit_frequency_30d numeric,
  contributor_growth_30d numeric,
  onboarding_clarity_score numeric,
  vibe_score numeric,
  vibe_breakdown jsonb,
  ai_summary text,
  ai_summary_generated_at timestamptz,
  last_synced_at timestamptz DEFAULT now(),
  sync_status text DEFAULT 'pending',
  sync_error text
);

CREATE INDEX idx_repositories_vibe_score ON repositories (vibe_score DESC NULLS LAST);
CREATE INDEX idx_repositories_primary_language ON repositories (primary_language);
CREATE INDEX idx_repositories_topics ON repositories USING gin (topics);
CREATE INDEX idx_repositories_last_pushed_at ON repositories (last_pushed_at DESC NULLS LAST);

ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to repositories"
  ON repositories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role will automatically bypass RLS for INSERT/UPDATE/DELETE
