-- OpenPath · contributions
-- A user's own activity, written by the sync job from their GitHub account.

create table if not exists public.contributions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  repo_id        uuid references public.repositories (id) on delete set null,
  repo_full_name text,

  type       text not null check (type in ('pr', 'issue', 'review', 'commit')),
  github_id  bigint,
  title      text,
  url        text,
  state      text check (state in ('open', 'closed', 'merged', 'draft')),
  merged_at  timestamptz,
  created_at timestamptz not null default now(),

  constraint contributions_identity_key unique (user_id, type, github_id)
);

create index if not exists contributions_user_idx
  on public.contributions (user_id, created_at desc);

create index if not exists contributions_repo_idx
  on public.contributions (repo_id);

alter table public.contributions enable row level security;

drop policy if exists "Users read their own contributions" on public.contributions;
create policy "Users read their own contributions"
  on public.contributions for select
  using (auth.uid() = user_id);

drop policy if exists "Service role manages contributions" on public.contributions;
create policy "Service role manages contributions"
  on public.contributions for all
  to service_role
  using (true)
  with check (true);
