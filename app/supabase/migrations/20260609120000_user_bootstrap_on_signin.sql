-- Bootstrap subscriptions row alongside profiles on every new sign-in.

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

  insert into public.subscriptions (user_id, plan, status, provider, plan_type, updated_at)
  values (new.id, 'free', 'active', 'manual', 'free', now())
  on conflict (user_id) do nothing;

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

  insert into public.subscriptions (user_id, plan, status, provider, plan_type, updated_at)
  values (uid, 'free', 'active', 'manual', 'free', now())
  on conflict (user_id) do nothing;

  return row;
end;
$$;

-- Backfill subscriptions for auth users missing a row.
insert into public.subscriptions (user_id, plan, status, provider, plan_type, updated_at)
select u.id, 'free', 'active', 'manual', 'free', now()
from auth.users u
where not exists (select 1 from public.subscriptions s where s.user_id = u.id);
