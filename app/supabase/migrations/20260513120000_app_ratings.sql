-- App rating + optional comment (Explore → Rate us)
-- Run in Supabase SQL Editor or: supabase db push

create table if not exists public.app_ratings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  rating real not null check (rating >= 0 and rating <= 1),
  comment text,
  platform text,
  app_version text
);

comment on table public.app_ratings is 'User mood rating (0–1) and optional feedback from Rate photodumps screen';

create index if not exists app_ratings_created_at_idx on public.app_ratings (created_at desc);

alter table public.app_ratings enable row level security;

-- Anyone with the anon key can submit feedback (no public reads)
create policy "Allow insert app_ratings"
  on public.app_ratings
  for insert
  to anon, authenticated
  with check (true);

-- Optional: users can only attach their own uid when inserting
-- create policy "Insert own user_id only"
--   on public.app_ratings for insert to authenticated
--   with check (user_id is null or user_id = auth.uid());

-- Block reads from anonymous API (use service role / dashboard for exports)
create policy "Deny select app_ratings"
  on public.app_ratings
  for select
  to anon, authenticated
  using (false);
