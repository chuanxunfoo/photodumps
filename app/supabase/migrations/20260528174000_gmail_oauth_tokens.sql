-- Persist Gmail OAuth tokens in app-owned schema (portable across Supabase auth schema changes).

create table if not exists public.gmail_oauth_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider_token text,
  provider_refresh_token text,
  updated_at timestamptz not null default now()
);

alter table public.gmail_oauth_tokens enable row level security;

drop policy if exists "gmail_tokens_select_own" on public.gmail_oauth_tokens;
create policy "gmail_tokens_select_own"
  on public.gmail_oauth_tokens
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_profile_admin());

drop policy if exists "gmail_tokens_insert_own" on public.gmail_oauth_tokens;
create policy "gmail_tokens_insert_own"
  on public.gmail_oauth_tokens
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "gmail_tokens_update_own" on public.gmail_oauth_tokens;
create policy "gmail_tokens_update_own"
  on public.gmail_oauth_tokens
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_profile_admin())
  with check (user_id = auth.uid() or public.is_profile_admin());
