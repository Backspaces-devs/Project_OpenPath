CREATE TABLE quests (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  required_count int NOT NULL,
  xp int NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE user_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id text NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  progress int DEFAULT 0,
  is_completed bool DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, quest_id)
);

ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view quests"
  ON quests
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can view own quests"
  ON user_quests
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own quests"
  ON user_quests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own quests"
  ON user_quests
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own quests"
  ON user_quests
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

INSERT INTO quests (id, name, description, category, required_count, xp) VALUES
  ('first_blood', 'First Blood', 'Star your first repo', 'discovery', 1, 10),
  ('explorer', 'Explorer', 'Save 5 repos to collections', 'discovery', 5, 25),
  ('first_issue', 'First Issue', 'Comment on your first issue', 'contribution', 1, 15),
  ('first_pr', 'First PR', 'Open your first pull request', 'contribution', 1, 50),
  ('merged', 'Merged', 'Get your first PR merged', 'contribution', 1, 100),
  ('streak_3', 'Streak 3', 'Get 3 PRs merged', 'contribution', 3, 150),
  ('polyglot', 'Polyglot', 'Contribute to repos in 3 different languages', 'skill', 3, 75),
  ('mentor_start', 'Mentor Start', 'Answer 3 questions', 'community', 3, 50),
  ('team_player', 'Team Player', 'Join a student project', 'community', 1, 30),
  ('project_lead', 'Project Lead', 'Post your own project', 'community', 1, 40),
  ('vibe_hunter', 'Vibe Hunter', 'Contribute to a repo with Vibe Score > 85', 'contribution', 1, 80),
  ('core_contributor', 'Core Contributor', 'Get 10 PRs merged', 'contribution', 10, 500);
