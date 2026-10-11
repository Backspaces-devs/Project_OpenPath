CREATE TABLE sync_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  records_processed int DEFAULT 0,
  status text NOT NULL,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- No public policies created. Access requires service role privileges.
