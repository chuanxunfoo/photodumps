-- Paste into Supabase → SQL Editor (run top to bottom)

-- 1) Add plan_type column
alter table public.profiles
  add column if not exists plan_type text;

update public.profiles
set plan_type = 'hobby'
where plan_type is null;

alter table public.profiles
  alter column plan_type set default 'hobby';

alter table public.profiles
  alter column plan_type set not null;

alter table public.profiles
  drop constraint if exists profiles_plan_type_check;

alter table public.profiles
  add constraint profiles_plan_type_check
  check (plan_type in ('hobby', 'pro', 'admin'));

-- 2) Set your account to Pro (no updated_at — works even if that column is missing)
update public.profiles p
set plan_type = 'pro'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('chuanxunfoo@gmail.com');

-- 3) Fix RLS infinite recursion (required for app to read/write profiles)
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
      and plan_type = 'admin'
  );
$$;

revoke all on function public.is_profile_admin() from public;
grant execute on function public.is_profile_admin() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_profile_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_update_any" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_profile_admin())
  with check (id = auth.uid() or public.is_profile_admin());
