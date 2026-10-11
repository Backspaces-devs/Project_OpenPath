-- OpenPath · repo Q&A
-- Questions about a specific repository, answered by people who know it.

create table if not exists public.repo_questions (
  id             uuid primary key default gen_random_uuid(),
  repo_id        uuid references public.repositories (id) on delete cascade,
  repo_full_name text not null,
  author_id      uuid not null references auth.users (id) on delete cascade,
  title          text not null,
  body           text not null,
  is_resolved    boolean not null default false,
  upvotes        integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.repo_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.repo_questions (id) on delete cascade,
  author_id   uuid not null references auth.users (id) on delete cascade,
  body        text not null,
  is_accepted boolean not null default false,
  upvotes     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists repo_questions_repo_idx
  on public.repo_questions (repo_full_name, created_at desc);

create index if not exists repo_questions_repo_id_idx
  on public.repo_questions (repo_id);

create index if not exists repo_answers_question_idx
  on public.repo_answers (question_id, is_accepted desc, upvotes desc);

alter table public.repo_questions enable row level security;
alter table public.repo_answers enable row level security;

-- repo_questions ----------------------------------------------------

drop policy if exists "Questions are readable by everyone" on public.repo_questions;
create policy "Questions are readable by everyone"
  on public.repo_questions for select
  using (true);

drop policy if exists "Authenticated users can ask" on public.repo_questions;
create policy "Authenticated users can ask"
  on public.repo_questions for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors update their own questions" on public.repo_questions;
create policy "Authors update their own questions"
  on public.repo_questions for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Authors delete their own questions" on public.repo_questions;
create policy "Authors delete their own questions"
  on public.repo_questions for delete
  to authenticated
  using (auth.uid() = author_id);

-- repo_answers ------------------------------------------------------

drop policy if exists "Answers are readable by everyone" on public.repo_answers;
create policy "Answers are readable by everyone"
  on public.repo_answers for select
  using (true);

drop policy if exists "Authenticated users can answer" on public.repo_answers;
create policy "Authenticated users can answer"
  on public.repo_answers for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors update their own answers" on public.repo_answers;
create policy "Authors update their own answers"
  on public.repo_answers for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Authors delete their own answers" on public.repo_answers;
create policy "Authors delete their own answers"
  on public.repo_answers for delete
  to authenticated
  using (auth.uid() = author_id);
