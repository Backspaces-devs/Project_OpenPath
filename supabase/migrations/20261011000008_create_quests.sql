-- OpenPath · quests
-- Curated contribution challenges plus per-user progress.

create table if not exists public.quests (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text,
  difficulty  text not null default 'starter'
                check (difficulty in ('starter', 'intermediate', 'advanced')),
  xp          integer not null default 10,
  criteria    jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.user_quests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  quest_id     uuid not null references public.quests (id) on delete cascade,
  status       text not null default 'active'
                 check (status in ('active', 'completed', 'abandoned')),
  progress     jsonb,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint user_quests_unique unique (user_id, quest_id)
);

create index if not exists quests_active_idx
  on public.quests (is_active, difficulty);

create index if not exists user_quests_user_idx
  on public.user_quests (user_id, status);

alter table public.quests enable row level security;
alter table public.user_quests enable row level security;

-- quests ------------------------------------------------------------

drop policy if exists "Quests are readable by everyone" on public.quests;
create policy "Quests are readable by everyone"
  on public.quests for select
  using (true);

drop policy if exists "Service role manages quests" on public.quests;
create policy "Service role manages quests"
  on public.quests for all
  to service_role
  using (true)
  with check (true);

-- user_quests -------------------------------------------------------

drop policy if exists "Users read their own quest progress" on public.user_quests;
create policy "Users read their own quest progress"
  on public.user_quests for select
  using (auth.uid() = user_id);

drop policy if exists "Users manage their own quest progress" on public.user_quests;
create policy "Users manage their own quest progress"
  on public.user_quests for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed the launch quests -------------------------------------------

insert into public.quests (slug, title, description, difficulty, xp, criteria) values
  ('first-look', 'First look', 'Open three repositories and read their contributing guides.', 'starter', 10,
    '{"type":"repos_viewed","target":3}'::jsonb),
  ('good-first-issue', 'Land a good first issue', 'Open a pull request against a repository with a good first issue label.', 'starter', 40,
    '{"type":"pr_opened","labels":["good first issue"]}'::jsonb),
  ('documentation-drive', 'Documentation drive', 'Improve documentation in a repository you had not contributed to before.', 'intermediate', 60,
    '{"type":"pr_merged","labels":["documentation"]}'::jsonb),
  ('maintainer-streak', 'Maintainer streak', 'Get pull requests merged in four consecutive weeks.', 'advanced', 150,
    '{"type":"weekly_streak","target":4}'::jsonb)
on conflict (slug) do nothing;
