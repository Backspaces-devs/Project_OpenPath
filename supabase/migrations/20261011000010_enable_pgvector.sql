CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE repo_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id bigint NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_repo_embeddings_embedding ON repo_embeddings USING hnsw (embedding vector_cosine_ops);

ALTER TABLE repo_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view repo embeddings"
  ON repo_embeddings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION match_repos(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  repo_id bigint,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    repo_embeddings.repo_id,
    1 - (repo_embeddings.embedding <=> query_embedding) AS similarity
  FROM repo_embeddings
  WHERE 1 - (repo_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY repo_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
