-- Stripe billing columns on profiles + subscriptions helper table

alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists stripe_subscription_status text;
alter table public.profiles add column if not exists stripe_price_id text;
alter table public.profiles add column if not exists subscription_plan text;
alter table public.profiles add column if not exists subscription_ends_at timestamptz;

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bonus_swipes int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "subscriptions_upsert_own" on public.subscriptions;
create policy "subscriptions_upsert_own"
  on public.subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
  on public.subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
