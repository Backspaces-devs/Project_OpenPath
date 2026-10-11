-- OpenPath · issues
-- Synced open issues for repositories we track, with the beginner labels
-- denormalised into booleans so the /issues feed never has to scan arrays.

create table if not exists public.issues (
  id                uuid primary key default gen_random_uuid(),
  github_id         bigint not null unique,
  repo_id           uuid references public.repositories (id) on delete cascade,
  repo_full_name    text,

  number            integer not null,
  title             text not null,
  body              text,
  state             text not null default 'open' check (state in ('open', 'closed')),
  is_pull_request   boolean not null default false,
  labels            text[] not null default '{}',

  is_good_first_issue boolean not null default false,
  is_help_wanted      boolean not null default false,

  comments          integer not null default 0,
  author            text,
  html_url          text not null,

  github_created_at timestamptz,
  github_updated_at timestamptz,
  closed_at         timestamptz,
  synced_at         timestamptz not null default now(),

  constraint issues_repo_number_key unique (repo_id, number)
);

create index if not exists issues_repo_id_idx
  on public.issues (repo_id);

create index if not exists issues_good_first_issue_idx
  on public.issues (repo_id, is_good_first_issue)
  where state = 'open';

create index if not exists issues_labels_idx
  on public.issues using gin (labels);

create index if not exists issues_created_at_idx
  on public.issues (github_created_at desc nulls last);

create index if not exists issues_repo_full_name_idx
  on public.issues (repo_full_name);

alter table public.issues enable row level security;

drop policy if exists "Issues are readable by everyone" on public.issues;
create policy "Issues are readable by everyone"
  on public.issues for select
  using (true);

drop policy if exists "Service role manages issues" on public.issues;
create policy "Service role manages issues"
  on public.issues for all
  to service_role
  using (true)
  with check (true);
