-- Keep auth + billing + spin data in sync with app behavior.

-- Ensure helper exists for admin checks.
create or replace function public.is_profile_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        plan_type = 'admin'
        or coalesce(is_admin, false) = true
      )
  );
$$;

revoke all on function public.is_profile_admin() from public;
grant execute on function public.is_profile_admin() to authenticated;

-- Subscriptions table should be one row per user.
alter table public.subscriptions
  add column if not exists user_id uuid,
  add column if not exists plan text default 'free',
  add column if not exists status text default 'active',
  add column if not exists provider text default 'manual',
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists plan_type text default 'free',
  add column if not exists bonus_swipes integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- If old PK is not user_id, keep it but enforce one-row-per-user uniqueness.
create unique index if not exists subscriptions_user_id_unique_idx
  on public.subscriptions(user_id)
  where user_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_user_id_fkey'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_user_id_fkey
      foreign key (user_id) references auth.users(id)
      on delete cascade;
  end if;
end $$;

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_profile_admin());

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
  on public.subscriptions for insert to authenticated
  with check (user_id = auth.uid() or public.is_profile_admin());

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
  on public.subscriptions for update to authenticated
  using (user_id = auth.uid() or public.is_profile_admin())
  with check (user_id = auth.uid() or public.is_profile_admin());

-- Purchases tables need row-level write/read for own rows, admin can view all.
alter table public.spin_purchases enable row level security;
drop policy if exists "spin_purchases_select_own" on public.spin_purchases;
create policy "spin_purchases_select_own"
  on public.spin_purchases for select to authenticated
  using (user_id = auth.uid() or public.is_profile_admin());
drop policy if exists "spin_purchases_insert_own" on public.spin_purchases;
create policy "spin_purchases_insert_own"
  on public.spin_purchases for insert to authenticated
  with check (user_id = auth.uid());

alter table public.swipe_purchases enable row level security;
drop policy if exists "swipe_purchases_select_own" on public.swipe_purchases;
create policy "swipe_purchases_select_own"
  on public.swipe_purchases for select to authenticated
  using (user_id = auth.uid() or public.is_profile_admin());
drop policy if exists "swipe_purchases_insert_own" on public.swipe_purchases;
create policy "swipe_purchases_insert_own"
  on public.swipe_purchases for insert to authenticated
  with check (user_id = auth.uid());

-- Admin RPC to manually upgrade/degrade plans safely.
create or replace function public.admin_set_user_plan(target_user uuid, next_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_profile_admin() then
    raise exception 'not authorized';
  end if;

  if next_plan not in ('hobby', 'pro', 'admin') then
    raise exception 'invalid plan';
  end if;

  update public.profiles
  set
    plan_type = next_plan,
    is_admin = (next_plan = 'admin'),
    updated_at = now()
  where id = target_user;

  insert into public.subscriptions (
    user_id,
    plan,
    status,
    provider,
    plan_type,
    updated_at
  )
  values (
    target_user,
    case when next_plan = 'pro' then 'pro_monthly' else 'free' end,
    case when next_plan = 'hobby' then 'active' else 'active' end,
    'manual',
    case when next_plan = 'hobby' then 'free' else 'monthly' end,
    now()
  )
  on conflict (user_id) do update
    set
      plan = excluded.plan,
      provider = excluded.provider,
      plan_type = excluded.plan_type,
      updated_at = now();
end;
$$;

revoke all on function public.admin_set_user_plan(uuid, text) from public;
grant execute on function public.admin_set_user_plan(uuid, text) to authenticated;
