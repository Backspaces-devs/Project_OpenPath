CREATE TABLE student_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES student_projects(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE student_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view projects"
  ON student_projects
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own projects"
  ON student_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own projects"
  ON student_projects
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own projects"
  ON student_projects
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Public can view applications"
  ON project_applications
  FOR SELECT
  TO authenticated
  USING (
    applicant_id = (SELECT auth.uid()) OR
    project_id IN (SELECT id FROM student_projects WHERE owner_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can insert applications"
  ON project_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id = (SELECT auth.uid()));

CREATE POLICY "Project owners can update application status"
  ON project_applications
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (SELECT id FROM student_projects WHERE owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    project_id IN (SELECT id FROM student_projects WHERE owner_id = (SELECT auth.uid()))
  );
