CREATE TABLE repo_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id bigint NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE repo_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES repo_questions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_accepted bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE repo_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view questions"
  ON repo_questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert questions"
  ON repo_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY "Authors can update own questions"
  ON repo_questions
  FOR UPDATE
  TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY "Authors can delete own questions"
  ON repo_questions
  FOR DELETE
  TO authenticated
  USING (author_id = (SELECT auth.uid()));

CREATE POLICY "Public can view answers"
  ON repo_answers
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert answers"
  ON repo_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY "Authors can update own answers"
  ON repo_answers
  FOR UPDATE
  TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY "Authors can delete own answers"
  ON repo_answers
  FOR DELETE
  TO authenticated
  USING (author_id = (SELECT auth.uid()));
