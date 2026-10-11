CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_public bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  repo_id bigint NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE (collection_id, repo_id)
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public collections"
  ON collections
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Users can view own collections"
  ON collections
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own collections"
  ON collections
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own collections"
  ON collections
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own collections"
  ON collections
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Public can view public collection items"
  ON collection_items
  FOR SELECT
  TO anon, authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE is_public = true
    )
  );

CREATE POLICY "Users can view own collection items"
  ON collection_items
  FOR SELECT
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage own collection items"
  ON collection_items
  FOR ALL
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = (SELECT auth.uid())
    )
  );
