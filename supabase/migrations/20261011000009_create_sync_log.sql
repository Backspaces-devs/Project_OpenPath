-- OpenPath · sync_log
-- Audit trail for the seed/sync cron jobs. Service role only.

create table if not exists public.sync_log (
  id              uuid primary key default gen_random_uuid(),
  job             text not null,
  status          text not null default 'running'
                    check (status in ('running', 'success', 'failed')),
  repos_processed integer not null default 0,
  repos_failed    integer not null default 0,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  error           text,
  meta            jsonb
);

create index if not exists sync_log_job_idx
  on public.sync_log (job, started_at desc);

alter table public.sync_log enable row level security;

drop policy if exists "Service role manages sync log" on public.sync_log;
create policy "Service role manages sync log"
  on public.sync_log for all
  to service_role
  using (true)
  with check (true);
