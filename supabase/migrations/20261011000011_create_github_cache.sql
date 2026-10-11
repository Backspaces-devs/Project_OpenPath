CREATE TABLE github_cache (
  cache_key text PRIMARY KEY,
  etag text,
  data jsonb,
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE github_cache ENABLE ROW LEVEL SECURITY;

-- No public policies created. Access requires service role privileges.
