-- OpenPath · pgvector
-- Phase 4 placeholder: semantic search over repository descriptions and READMEs.
-- Safe to run on any Supabase project — vector ships with the platform.

create extension if not exists vector;

create table if not exists public.repo_embeddings (
  id        uuid primary key default gen_random_uuid(),
  repo_id   uuid not null references public.repositories (id) on delete cascade,
  content   text not null,
  embedding vector(1536),
  model     text,
  created_at timestamptz not null default now()
);

create index if not exists repo_embeddings_repo_idx
  on public.repo_embeddings (repo_id);

-- HNSW beats IVFFlat here: the table starts small and grows unpredictably.
-- Created conditionally because HNSW indexes on a vector column require
-- pgvector >= 0.5; every current Supabase project satisfies that.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'repo_embeddings_embedding_idx'
  ) then
    create index repo_embeddings_embedding_idx
      on public.repo_embeddings using hnsw (embedding vector_cosine_ops);
  end if;
end;
$$;

alter table public.repo_embeddings enable row level security;

drop policy if exists "Embeddings are readable by everyone" on public.repo_embeddings;
create policy "Embeddings are readable by everyone"
  on public.repo_embeddings for select
  using (true);

drop policy if exists "Service role manages embeddings" on public.repo_embeddings;
create policy "Service role manages embeddings"
  on public.repo_embeddings for all
  to service_role
  using (true)
  with check (true);

-- Cosine similarity helper used by Phase 4 search.
create or replace function public.match_repo_embeddings (
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 20
)
returns table (
  repo_id uuid,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    e.repo_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.repo_embeddings e
  where 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
