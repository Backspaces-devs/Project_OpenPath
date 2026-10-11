-- OpenPath · repositories
-- The single source of truth for every repository OpenPath knows about.
-- Public read (RLS), writes only through the service role (seed/sync scripts).

create extension if not exists pgcrypto;

-- Keeps `refreshed_at` honest without every writer having to remember it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.refreshed_at = now();
  return new;
end;
$$;

create table if not exists public.repositories (
  id                uuid primary key default gen_random_uuid(),
  github_id         bigint not null unique,
  node_id           text,

  owner             text not null,
  name              text not null,
  full_name         text not null unique,
  description       text,
  homepage          text,
  html_url          text not null,
  default_branch    text not null default 'main',

  primary_language  text,
  topics            text[] not null default '{}',
  license_spdx      text,

  stars             integer not null default 0,
  forks             integer not null default 0,
  watchers          integer not null default 0,
  open_issues       integer not null default 0,
  subscribers       integer,
  contributors_count integer,

  commits_last_90d  integer,
  commits_last_year integer,
  closed_issues     integer,
  merged_pull_requests integer,
  median_issue_close_hours numeric(10, 2),

  good_first_issues  integer not null default 0,
  help_wanted_issues integer not null default 0,

  has_readme          boolean,
  has_contributing    boolean,
  has_code_of_conduct boolean,
  has_license         boolean,

  is_archived  boolean not null default false,
  is_fork      boolean not null default false,
  is_template  boolean not null default false,

  repo_created_at timestamptz,
  pushed_at      timestamptz,
  repo_updated_at timestamptz,

  vibe_score       numeric(5, 2),
  vibe_breakdown   jsonb,
  vibe_confidence  numeric(4, 3),
  vibe_computed_at timestamptz,

  sync_status    text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
  sync_error     text,
  last_synced_at timestamptz,

  inserted_at  timestamptz not null default now(),
  refreshed_at timestamptz not null default now()
);

comment on table public.repositories is
  'One row per GitHub repository OpenPath has discovered or synced.';

-- Vibe Score leaderboard — the primary read path.
create index if not exists repositories_vibe_score_idx
  on public.repositories (vibe_score desc nulls last);

create index if not exists repositories_stars_idx
  on public.repositories (stars desc);

create index if not exists repositories_pushed_at_idx
  on public.repositories (pushed_at desc nulls last);

create index if not exists repositories_primary_language_idx
  on public.repositories (primary_language)
  where primary_language is not null;

create index if not exists repositories_topics_idx
  on public.repositories using gin (topics);

create index if not exists repositories_good_first_issues_idx
  on public.repositories (good_first_issues desc)
  where good_first_issues > 0;

create index if not exists repositories_sync_status_idx
  on public.repositories (sync_status);

-- Trigram support for the free-text filter on /discover.
create extension if not exists pg_trgm;

create index if not exists repositories_full_name_trgm_idx
  on public.repositories using gin (full_name gin_trgm_ops);

drop trigger if exists repositories_set_updated_at on public.repositories;
create trigger repositories_set_updated_at
  before update on public.repositories
  for each row execute function public.set_updated_at();

alter table public.repositories enable row level security;

drop policy if exists "Repositories are readable by everyone" on public.repositories;
create policy "Repositories are readable by everyone"
  on public.repositories for select
  using (true);

drop policy if exists "Service role manages repositories" on public.repositories;
create policy "Service role manages repositories"
  on public.repositories for all
  to service_role
  using (true)
  with check (true);
