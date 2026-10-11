-- OpenPath · github_cache
-- ETag-backed response cache. Conditional requests that return 304 do not
-- count against the GitHub rate limit, which is what makes syncing cheap.

create table if not exists public.github_cache (
  cache_key  text primary key,
  etag       text,
  data       jsonb,
  fetched_at timestamptz not null default now()
);

create index if not exists github_cache_fetched_at_idx
  on public.github_cache (fetched_at desc);

alter table public.github_cache enable row level security;

drop policy if exists "Service role manages GitHub cache" on public.github_cache;
create policy "Service role manages GitHub cache"
  on public.github_cache for all
  to service_role
  using (true)
  with check (true);
