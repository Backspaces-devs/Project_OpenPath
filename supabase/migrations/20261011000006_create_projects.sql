-- OpenPath · student projects
-- Project owners post a build; other members apply to work on it together.

create table if not exists public.student_projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  repo_id     uuid references public.repositories (id) on delete set null,
  title       text not null,
  summary     text not null,
  difficulty  text check (difficulty in ('starter', 'intermediate', 'advanced')),
  stack       text[] not null default '{}',
  slots       integer not null default 4 check (slots > 0),
  is_open     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.project_applications (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.student_projects (id) on delete cascade,
  applicant_id uuid not null references auth.users (id) on delete cascade,
  message      text,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint project_applications_unique unique (project_id, applicant_id)
);

create index if not exists student_projects_open_idx
  on public.student_projects (is_open, created_at desc);

create index if not exists student_projects_owner_idx
  on public.student_projects (owner_id);

create index if not exists project_applications_project_idx
  on public.project_applications (project_id, created_at desc);

create index if not exists project_applications_applicant_idx
  on public.project_applications (applicant_id);

alter table public.student_projects enable row level security;
alter table public.project_applications enable row level security;

-- student_projects --------------------------------------------------

drop policy if exists "Student projects are readable by everyone" on public.student_projects;
create policy "Student projects are readable by everyone"
  on public.student_projects for select
  using (true);

drop policy if exists "Owners manage their own projects" on public.student_projects;
create policy "Owners manage their own projects"
  on public.student_projects for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- project_applications ----------------------------------------------

drop policy if exists "Applicants and owners see applications" on public.project_applications;
create policy "Applicants and owners see applications"
  on public.project_applications for select
  using (
    auth.uid() = applicant_id
    or exists (
      select 1 from public.student_projects p
      where p.id = project_applications.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can apply" on public.project_applications;
create policy "Authenticated users can apply"
  on public.project_applications for insert
  to authenticated
  with check (auth.uid() = applicant_id);

drop policy if exists "Applicants can withdraw" on public.project_applications;
create policy "Applicants can withdraw"
  on public.project_applications for update
  to authenticated
  using (auth.uid() = applicant_id)
  with check (auth.uid() = applicant_id);

drop policy if exists "Owners can decide applications" on public.project_applications;
create policy "Owners can decide applications"
  on public.project_applications for update
  to authenticated
  using (
    exists (
      select 1 from public.student_projects p
      where p.id = project_applications.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.student_projects p
      where p.id = project_applications.project_id and p.owner_id = auth.uid()
    )
  );
