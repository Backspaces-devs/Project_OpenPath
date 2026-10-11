CREATE TABLE issues (
  id bigserial PRIMARY KEY,
  github_id bigint UNIQUE NOT NULL,
  repo_id bigint REFERENCES repositories(id) ON DELETE CASCADE,
  number int NOT NULL,
  title text NOT NULL,
  body text,
  html_url text,
  state text,
  labels text[],
  is_good_first_issue bool DEFAULT false,
  is_help_wanted bool DEFAULT false,
  comments_count int DEFAULT 0,
  created_at_github timestamptz,
  updated_at_github timestamptz,
  closed_at_github timestamptz,
  first_maintainer_response_at timestamptz,
  first_response_hours numeric,
  assignee_login text,
  difficulty_estimate text,
  ai_guide text,
  last_synced_at timestamptz DEFAULT now()
);

CREATE INDEX idx_issues_repo_id_gfi ON issues (repo_id, is_good_first_issue);
CREATE INDEX idx_issues_labels ON issues USING gin (labels);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to issues"
  ON issues
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role bypasses RLS for write operations
