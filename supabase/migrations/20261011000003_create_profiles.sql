-- OpenPath · profiles
-- One row per auth.users row, created automatically on signup.

create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  username           text unique,
  display_name       text,
  avatar_url         text,
  github_username    text,
  bio                text,
  skills             text[] not null default '{}',
  preferred_languages text[] not null default '{}',
  experience_level   text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  timezone           text,
  is_public          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists profiles_github_username_idx
  on public.profiles (github_username)
  where github_username is not null;

create index if not exists profiles_preferred_languages_idx
  on public.profiles using gin (preferred_languages);

-- Mirror the row into auth.users on signup so the app never has to upsert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, github_username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'preferred_username'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'user_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are readable by everyone" on public.profiles;
create policy "Public profiles are readable by everyone"
  on public.profiles for select
  using (is_public = true or auth.uid() = id);

drop policy if exists "Users insert their own profile" on public.profiles;
create policy "Users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
