-- DEPRECATED for this app build: production uses a single-row `user_stats` per user (see `increment_user_stats` migration).
-- Do not run this file if your project already has the aggregated `user_stats` table keyed by `user_id`.
--
-- Per-batch deletion stats for storage analytics (Insights, etc.)
-- Run in Supabase SQL Editor or: supabase db push

create table if not exists public.user_stats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bytes_cleared bigint not null default 0,
  items_count int not null default 0,
  source text not null default 'dump'
    check (source in ('dump', 'insights', 'supercut')),
  session_id text not null
);

comment on table public.user_stats is 'Aggregated deletion batches: bytes cleared and item counts per user session';

create index if not exists user_stats_user_created_idx
  on public.user_stats (user_id, created_at desc);

create index if not exists user_stats_user_session_idx
  on public.user_stats (user_id, session_id);

alter table public.user_stats enable row level security;

create policy "user_stats_select_own"
  on public.user_stats for select to authenticated
  using (user_id = auth.uid());

create policy "user_stats_insert_own"
  on public.user_stats for insert to authenticated
  with check (user_id = auth.uid());
