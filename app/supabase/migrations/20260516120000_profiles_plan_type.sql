-- Add plan_type to existing public.profiles (safe if column is missing)
-- Run in Supabase → SQL Editor → New query → Run

-- 1) Column + backfill (works when profiles already exists without plan_type)
alter table public.profiles
  add column if not exists plan_type text;

update public.profiles
set plan_type = 'hobby'
where plan_type is null;

alter table public.profiles
  alter column plan_type set default 'hobby';

alter table public.profiles
  alter column plan_type set not null;

-- Optional columns the app uses (no-op if you already have them)
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- 2) Allowed values
alter table public.profiles
  drop constraint if exists profiles_plan_type_check;

alter table public.profiles
  add constraint profiles_plan_type_check
  check (plan_type in ('hobby', 'pro', 'admin'));

create index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

-- 3) RLS via security definer helper (avoids infinite recursion on profiles)
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

-- 4) Your account → Pro
update public.profiles p
set
  plan_type = 'pro',
  email = coalesce(p.email, u.email),
  username = coalesce(p.username, split_part(u.email, '@', 1)),
  updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('chuanxunfoo@gmail.com');

insert into public.profiles (id, email, username, plan_type, updated_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  'pro',
  now()
from auth.users u
where lower(u.email) = lower('chuanxunfoo@gmail.com')
  and not exists (select 1 from public.profiles p where p.id = u.id);

-- 5) Optional: make yourself admin (uncomment + change email)
-- update public.profiles p
-- set plan_type = 'admin', updated_at = now()
-- from auth.users u
-- where p.id = u.id and lower(u.email) = lower('your-admin@email.com');
