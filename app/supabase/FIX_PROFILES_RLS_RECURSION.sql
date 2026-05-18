-- Fixes: "infinite recursion detected in policy for relation profiles"
-- Run this in Supabase SQL Editor after adding plan_type.

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
