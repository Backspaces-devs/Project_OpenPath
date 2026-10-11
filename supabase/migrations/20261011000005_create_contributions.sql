CREATE TABLE contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  github_url text NOT NULL,
  state text,
  xp_awarded int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contributions"
  ON contributions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Service role bypasses RLS for INSERT/UPDATE operations
