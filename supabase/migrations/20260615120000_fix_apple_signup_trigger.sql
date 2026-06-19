-- Fix "database error saving new user" on Apple Sign In.
-- Profile row is required; subscriptions bootstrap must never block auth.users insert.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  plan_type text not null default 'hobby',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists plan_type text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles set plan_type = 'hobby' where plan_type is null;
alter table public.profiles alter column plan_type set default 'hobby';

alter table public.profiles drop constraint if exists profiles_plan_type_check;
alter table public.profiles
  add constraint profiles_plan_type_check
  check (plan_type in ('hobby', 'pro', 'admin'));

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bonus_swipes int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists user_id uuid,
  add column if not exists plan text default 'free',
  add column if not exists status text default 'active',
  add column if not exists provider text default 'manual',
  add column if not exists plan_type text default 'free',
  add column if not exists bonus_swipes integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists subscriptions_user_id_unique_idx
  on public.subscriptions (user_id)
  where user_id is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  uemail text;
begin
  uemail := nullif(trim(coalesce(new.email, '')), '');
  uname := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(split_part(coalesce(uemail, ''), '@', 1), ''),
    'user_' || left(new.id::text, 8)
  );

  insert into public.profiles (id, email, username, plan_type, updated_at)
  values (new.id, uemail, uname, 'hobby', now())
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    username = coalesce(public.profiles.username, excluded.username),
    updated_at = now();

  begin
    insert into public.subscriptions (user_id, plan, status, provider, plan_type, updated_at)
    values (new.id, 'free', 'active', 'manual', 'free', now())
    on conflict (user_id) do nothing;
  exception
    when others then
      raise warning 'handle_new_user subscriptions skipped for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

create or replace function public.ensure_my_profile(
  p_username text default null,
  p_email text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  row public.profiles;
  uname text;
  uemail text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  uemail := nullif(trim(coalesce(p_email, '')), '');
  uname := coalesce(
    nullif(trim(coalesce(p_username, '')), ''),
    nullif(split_part(coalesce(uemail, ''), '@', 1), ''),
    'user_' || left(uid::text, 8)
  );

  insert into public.profiles (id, email, username, plan_type, updated_at)
  values (uid, uemail, uname, 'hobby', now())
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    username = coalesce(public.profiles.username, excluded.username),
    updated_at = now()
  returning * into row;

  begin
    insert into public.subscriptions (user_id, plan, status, provider, plan_type, updated_at)
    values (uid, 'free', 'active', 'manual', 'free', now())
    on conflict (user_id) do nothing;
  exception
    when others then
      raise warning 'ensure_my_profile subscriptions skipped for %: %', uid, sqlerrm;
  end;

  return row;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.ensure_my_profile(text, text) from public;
grant execute on function public.ensure_my_profile(text, text) to authenticated;
