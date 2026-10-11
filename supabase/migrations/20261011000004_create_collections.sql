-- OpenPath · collections
-- User-curated lists of repositories ("Saved", "Summer of Rust", ...).

create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint collections_owner_slug_key unique (owner_id, slug)
);

create table if not exists public.collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  repo_id       uuid not null references public.repositories (id) on delete cascade,
  note          text,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),

  constraint collection_items_unique_repo unique (collection_id, repo_id)
);

create index if not exists collections_owner_idx
  on public.collections (owner_id);

create index if not exists collection_items_collection_idx
  on public.collection_items (collection_id, position);

create index if not exists collection_items_repo_idx
  on public.collection_items (repo_id);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

-- collections -------------------------------------------------------

drop policy if exists "Public collections are readable" on public.collections;
create policy "Public collections are readable"
  on public.collections for select
  using (is_public = true or auth.uid() = owner_id);

drop policy if exists "Users create their own collections" on public.collections;
create policy "Users create their own collections"
  on public.collections for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users update their own collections" on public.collections;
create policy "Users update their own collections"
  on public.collections for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users delete their own collections" on public.collections;
create policy "Users delete their own collections"
  on public.collections for delete
  to authenticated
  using (auth.uid() = owner_id);

-- collection_items --------------------------------------------------

drop policy if exists "Items of visible collections are readable" on public.collection_items;
create policy "Items of visible collections are readable"
  on public.collection_items for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id
        and (c.is_public = true or c.owner_id = auth.uid())
    )
  );

drop policy if exists "Users manage items in their own collections" on public.collection_items;
create policy "Users manage items in their own collections"
  on public.collection_items for all
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id and c.owner_id = auth.uid()
    )
  );
